import { useCallback, useEffect, useRef, useState } from "react";

/**
 * S4-T3 — Hook universal de autosave/draft a localStorage para formularios.
 *
 * Persiste el estado del form en localStorage bajo `key` con debounce.
 * Recupera el borrador al montar (devuelve el snapshot inicial) y expone
 * `clearDraft` para borrar tras submit exitoso.
 *
 * Patrón de uso:
 *
 * ```tsx
 * const { draft, saveDraft, clearDraft, hasDraft } = useFormDraft<MyForm>(
 *   `oc-form-${empresaId}`,
 *   initialValue,
 * );
 *
 * const [value, setValue] = useState(draft ?? initialValue);
 * useEffect(() => saveDraft(value), [value, saveDraft]);
 *
 * async function submit() {
 *   const r = await createOC(...);
 *   if (r.ok) clearDraft();
 * }
 * ```
 *
 * Notas:
 * - `key` debe incluir el contexto (empresa_id, etc.) para no mezclar
 *   borradores entre empresas.
 * - El debounce default es 500ms para no escribir en cada keystroke.
 * - Storage falla silenciosamente en quota exceeded — el form sigue
 *   funcionando sin draft.
 */
export function useFormDraft<T>(
  key: string,
  initialValue: T,
  options?: {
    debounceMs?: number;
    /** Si retorna FALSE, no se guarda. Útil para skip-save cuando el
        form está vacío o se reseteó al default. */
    shouldSave?: (value: T) => boolean;
  },
): {
  draft: T | null;
  saveDraft: (value: T) => void;
  clearDraft: () => void;
  hasDraft: boolean;
} {
  const debounceMs = options?.debounceMs ?? 500;
  const shouldSave = options?.shouldSave ?? (() => true);

  // Cargar draft solo en el primer render (lazy initializer).
  const [draft, setDraftState] = useState<T | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (value: T) => {
      if (typeof window === "undefined") return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          if (shouldSave(value)) {
            window.localStorage.setItem(key, JSON.stringify(value));
            setDraftState(value);
          }
        } catch {
          // localStorage quota exceeded or disabled — fail silently.
        }
      }, debounceMs);
    },
    [key, debounceMs, shouldSave],
  );

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setDraftState(null);
  }, [key]);

  // Cleanup timer al unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Marca explícita para que la UI muestre el banner "Recuperaste un
  // borrador" solo si hubo uno en localStorage al cargar.
  const initialHasDraft = useRef(draft != null);

  // `initialValue` se conserva en la signatura para futuras extensiones
  // del hook (ej. merging draft + defaults). Por ahora unused intencional.
  void initialValue;

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft: initialHasDraft.current,
  };
}
