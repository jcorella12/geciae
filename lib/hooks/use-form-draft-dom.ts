"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

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
 * Patrón de uso:
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
 */
type DraftSnapshot = Record<string, string[]>;

export function useFormDraftDom(
  formRef: RefObject<HTMLFormElement>,
  key: string,
  options?: { debounceMs?: number },
): {
  /** TRUE cuando hay un draft recuperado y aún no se decidió restaurar/descartar. */
  showBanner: boolean;
  /** Handler para `onInput` del form. Snapshot via FormData con debounce. */
  onInput: () => void;
  /** Restaura los valores del draft al DOM. */
  applyDraft: () => void;
  /** Descarta el draft sin restaurar. */
  discardDraft: () => void;
  /** Borra el draft de localStorage (llamar tras submit exitoso). */
  clearDraft: () => void;
} {
  const { draft, saveDraft, clearDraft, hasDraft } = useFormDraft<DraftSnapshot>(
    key,
    {},
    {
      debounceMs: options?.debounceMs ?? 500,
      // No guardes drafts vacíos (form recién montado, todos los inputs vacíos).
      shouldSave: (v) => Object.values(v).some((arr) => arr.some((x) => x !== "")),
    },
  );

  const [showBanner, setShowBanner] = useState(hasDraft);

  const onInput = useCallback(() => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const snap: DraftSnapshot = {};
    fd.forEach((v, k) => {
      if (typeof v !== "string") return; // Skip File objects
      snap[k] ??= [];
      snap[k].push(v);
    });
    saveDraft(snap);
  }, [formRef, saveDraft]);

  const applyDraft = useCallback(() => {
    if (!formRef.current || !draft) {
      setShowBanner(false);
      return;
    }
    const form = formRef.current;

    // Reset checkboxes/radios primero (defaults pueden tener algunos marcados).
    form
      .querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"], input[type="radio"]',
      )
      .forEach((el) => {
        el.checked = false;
      });

    for (const [name, values] of Object.entries(draft)) {
      const elements = form.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >(`[name="${CSS.escape(name)}"]`);
      elements.forEach((el) => {
        if (el instanceof HTMLInputElement) {
          if (el.type === "checkbox" || el.type === "radio") {
            el.checked = values.some((v) => v === el.value);
          } else {
            el.value = values[0] ?? "";
            // Dispara eventos para que React actualice state de inputs
            // controlados (RFC, CURP con uppercase, etc.).
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else if (el instanceof HTMLSelectElement) {
          el.value = values[0] ?? "";
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (el instanceof HTMLTextAreaElement) {
          el.value = values[0] ?? "";
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    }
    setShowBanner(false);
  }, [draft, formRef]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setShowBanner(false);
  }, [clearDraft]);

  // Si el form se desmonta con cambios sin guardar, el debounce ya hizo
  // su trabajo — no necesitamos cleanup adicional.
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
