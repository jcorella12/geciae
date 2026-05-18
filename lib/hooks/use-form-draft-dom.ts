"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { useFormDraft } from "./use-form-draft";

/**
 * S4-T3 (continuación) — Adaptador de `useFormDraft` para forms
 * uncontrolled con FormData (pattern Next.js Server Actions).
 *
 * En lugar de exigir que el form tenga estado React centralizado,
 * este hook lee/restaura los valores directamente desde el DOM via
 * `formRef`. Funciona con inputs, selects, textareas, checkboxes y
 * radios. Para inputs controlados (con `value`/`onChange`) dispara
 * eventos sintéticos para que React actualice el state.
 *
 * Para forms con state React complejo (arrays dinámicos, ej.
 * conceptos[] de una cotización), pasa `stateExtra` con el state
 * actual y `onRestoreExtra` para hidratarlo al restaurar.
 *
 * Patrón básico (forms uncontrolled):
 *
 * ```tsx
 * const formRef = useRef<HTMLFormElement>(null);
 * const { showBanner, onInput, applyDraft, discardDraft, clearDraft } =
 *   useFormDraftDom(formRef, `cliente-${clienteId ?? "nuevo"}`);
 *
 * useEffect(() => {
 *   if (state.ok) clearDraft();
 * }, [state.ok, clearDraft]);
 *
 * return (
 *   <>
 *     {showBanner && (
 *       <DraftRecoveryBanner onRestore={applyDraft} onDiscard={discardDraft} />
 *     )}
 *     <form ref={formRef} onInput={onInput} action={formAction}>
 *       ...
 *     </form>
 *   </>
 * );
 * ```
 *
 * Con stateExtra (cotización con conceptos dinámicos):
 *
 * ```tsx
 * const [conceptos, setConceptos] = useState<Concepto[]>([nuevo()]);
 * const { showBanner, onInput, applyDraft, ... } = useFormDraftDom(
 *   formRef,
 *   `cotizacion-${id ?? "nueva"}`,
 *   {
 *     stateExtra: { conceptos },
 *     onRestoreExtra: (extra) => {
 *       if (extra?.conceptos) setConceptos(extra.conceptos);
 *     },
 *   },
 * );
 * ```
 */
type DomFields = Record<string, string[]>;

type Snapshot<E> = {
  dom: DomFields;
  extra?: E;
};

export function useFormDraftDom<E = unknown>(
  formRef: RefObject<HTMLFormElement>,
  key: string,
  options?: {
    debounceMs?: number;
    /** State React extra a persistir (objeto serializable). Se vuelve a leer
     *  en cada onInput, así que pasar la referencia actual del state. */
    stateExtra?: E;
    /** Callback para hidratar el state React al restaurar un draft. */
    onRestoreExtra?: (extra: E | undefined) => void;
  },
): {
  /** TRUE cuando hay un draft recuperado y aún no se decidió restaurar/descartar. */
  showBanner: boolean;
  /** Handler para `onInput` del form. Snapshot via FormData con debounce. */
  onInput: () => void;
  /** Restaura los valores del draft al DOM y al state extra. */
  applyDraft: () => void;
  /** Descarta el draft sin restaurar. */
  discardDraft: () => void;
  /** Borra el draft de localStorage (llamar tras submit exitoso). */
  clearDraft: () => void;
} {
  // Mantener stateExtra en ref para no recrear `onInput` en cada cambio del
  // state extra (haría que el form re-render y se pierda el foco del input).
  const stateExtraRef = useRef<E | undefined>(options?.stateExtra);
  stateExtraRef.current = options?.stateExtra;

  const onRestoreExtraRef = useRef(options?.onRestoreExtra);
  onRestoreExtraRef.current = options?.onRestoreExtra;

  const { draft, saveDraft, clearDraft, hasDraft } = useFormDraft<Snapshot<E>>(
    key,
    { dom: {} },
    {
      debounceMs: options?.debounceMs ?? 500,
      // No guardes snapshots completamente vacíos.
      shouldSave: (v) => {
        const domHasValues = Object.values(v.dom ?? {}).some((arr) =>
          arr.some((x) => x !== ""),
        );
        const extraHasValues = v.extra != null;
        return domHasValues || extraHasValues;
      },
    },
  );

  const [showBanner, setShowBanner] = useState(hasDraft);

  const onInput = useCallback(() => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const dom: DomFields = {};
    fd.forEach((v, k) => {
      if (typeof v !== "string") return; // Skip File objects
      dom[k] ??= [];
      dom[k].push(v);
    });
    saveDraft({ dom, extra: stateExtraRef.current });
  }, [formRef, saveDraft]);

  const applyDraft = useCallback(() => {
    if (!formRef.current || !draft) {
      setShowBanner(false);
      return;
    }

    // Restaurar state extra PRIMERO — si re-renderiza inputs nuevos (ej.
    // agrega filas de conceptos), después podemos setear sus values.
    if (draft.extra !== undefined && onRestoreExtraRef.current) {
      onRestoreExtraRef.current(draft.extra);
    }

    // Esperar un tick a que React re-renderice los inputs nuevos antes de
    // poblar values del DOM. requestAnimationFrame es suficiente.
    const applyDom = () => {
      const form = formRef.current;
      if (!form) return;

      // Reset checkboxes/radios primero (defaults pueden tener algunos marcados).
      form
        .querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"], input[type="radio"]',
        )
        .forEach((el) => {
          el.checked = false;
        });

      for (const [name, values] of Object.entries(draft.dom ?? {})) {
        const elements = form.querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >(`[name="${CSS.escape(name)}"]`);

        // Para arrays (conceptos[0][descripcion], conceptos[1][descripcion]),
        // querySelectorAll devuelve 1 elemento por cada idx único, así que
        // usamos forEach con el primer value disponible.
        elements.forEach((el, i) => {
          const value = values[i] ?? values[0] ?? "";
          if (el instanceof HTMLInputElement) {
            if (el.type === "checkbox" || el.type === "radio") {
              el.checked = values.some((v) => v === el.value);
            } else {
              el.value = value;
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
            }
          } else if (el instanceof HTMLSelectElement) {
            el.value = value;
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } else if (el instanceof HTMLTextAreaElement) {
            el.value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
      }
    };

    if (draft.extra !== undefined && onRestoreExtraRef.current) {
      // Wait two ticks for React to flush the state update + commit.
      requestAnimationFrame(() => requestAnimationFrame(applyDom));
    } else {
      applyDom();
    }

    setShowBanner(false);
  }, [draft, formRef]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setShowBanner(false);
  }, [clearDraft]);

  useEffect(() => {
    void key; // ensure dependency
  }, [key]);

  return {
    showBanner,
    onInput,
    applyDraft,
    discardDraft,
    clearDraft,
  };
}
