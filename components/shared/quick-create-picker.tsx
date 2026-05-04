"use client";

import { Plus, Search, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * QuickCreatePicker — selector con creación inline.
 *
 * Patrón estilo Linear/Notion: el usuario escribe para filtrar; si la entidad
 * que busca no existe, hace click en "+ Nueva …" y se abre un modal con el
 * mini-form que el padre define vía render-prop. Al guardar, el padre llama
 * `onCreated(nuevaEntidad)` y el picker la selecciona automáticamente.
 *
 * Genérico: el tipo de cada item solo necesita `id: string`. Los campos que
 * se muestran en cada opción se controlan con el render `renderItem`.
 *
 * Cómo aplicarlo en otro form:
 *
 * ```tsx
 * <QuickCreatePicker
 *   items={clientes}
 *   value={clienteId}
 *   onChange={setClienteId}
 *   placeholder="Buscar cliente…"
 *   getKey={(c) => c.id}
 *   getLabel={(c) => `${c.razon_social} · ${c.rfc ?? "sin RFC"}`}
 *   matchesQuery={(c, q) =>
 *     c.razon_social.toLowerCase().includes(q) ||
 *     (c.rfc ?? "").toLowerCase().includes(q)
 *   }
 *   newItemLabel="Nuevo cliente"
 *   renderCreateForm={({ onCreated, onCancel, initialQuery }) => (
 *     <ClientePotencialQuickForm
 *       initialNombre={initialQuery}
 *       onCreated={onCreated}
 *       onCancel={onCancel}
 *     />
 *   )}
 * />
 * ```
 */
export function QuickCreatePicker<T extends { id: string }>({
  items,
  value,
  onChange,
  placeholder = "Buscar…",
  getLabel,
  getSecondary,
  matchesQuery,
  newItemLabel = "Nueva entidad",
  renderCreateForm,
  disabled = false,
  inputName,
  required = false,
  emptyHint,
  onCreated,
}: {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  getLabel: (item: T) => string;
  getSecondary?: (item: T) => ReactNode;
  matchesQuery?: (item: T, query: string) => boolean;
  newItemLabel?: string;
  /** Render-prop para el mini-form del modal. */
  renderCreateForm: (args: {
    onCreated: (item: T) => void;
    onCancel: () => void;
    initialQuery: string;
  }) => ReactNode;
  disabled?: boolean;
  /** Si se pasa, renderiza un input hidden con `name=inputName` para forms. */
  inputName?: string;
  required?: boolean;
  emptyHint?: string;
  /** Callback adicional cuando se crea un item (para refrescar lista local). */
  onCreated?: (item: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const seleccionado = useMemo(
    () => items.find((i) => i.id === value) ?? null,
    [items, value],
  );

  const q = query.trim().toLowerCase();
  const filtrados = useMemo(() => {
    if (!q) return items;
    if (matchesQuery) return items.filter((it) => matchesQuery(it, q));
    return items.filter((it) => getLabel(it).toLowerCase().includes(q));
  }, [items, q, matchesQuery, getLabel]);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const onSelect = (id: string) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  const handleCreated = (item: T) => {
    setShowCreate(false);
    setQuery("");
    setOpen(false);
    onChange(item.id);
    onCreated?.(item);
  };

  return (
    <div ref={containerRef} className="relative">
      {inputName && (
        <input type="hidden" name={inputName} value={value} required={required} />
      )}

      {/* Trigger: muestra item seleccionado o placeholder */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          !seleccionado && "text-muted-foreground",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-left">
          {seleccionado ? getLabel(seleccionado) : placeholder}
        </span>
        <span className="ml-2 shrink-0 text-ink-3">
          {seleccionado ? (
            <X
              className="h-3.5 w-3.5 hover:text-ink-1"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {/* Popover de búsqueda + lista */}
      {open && !disabled && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-hidden rounded-md border border-border bg-card shadow-md">
          <div className="border-b border-border p-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="h-8"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
            {filtrados.length === 0 ? (
              <li className="px-3 py-2 text-[12px] text-ink-3">
                {emptyHint ?? "Sin resultados"}
              </li>
            ) : (
              filtrados.map((it) => {
                const active = it.id === value;
                return (
                  <li key={it.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => onSelect(it.id)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-[13px] transition-colors",
                        active
                          ? "bg-brand/10 text-brand"
                          : "hover:bg-bg-2",
                      )}
                    >
                      <span className="truncate">{getLabel(it)}</span>
                      {getSecondary && (
                        <span className="text-[11px] text-ink-3">
                          {getSecondary(it)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-left text-[12.5px] font-medium text-brand hover:bg-brand/10"
            >
              <Plus className="h-3.5 w-3.5" />+ {newItemLabel}
              {q && (
                <span className="ml-1 truncate text-[11px] font-normal text-ink-3">
                  &ldquo;{query}&rdquo;
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal de creación */}
      {showCreate && (
        <QuickCreateModal
          title={newItemLabel}
          onClose={() => setShowCreate(false)}
        >
          {renderCreateForm({
            onCreated: handleCreated,
            onCancel: () => setShowCreate(false),
            initialQuery: query,
          })}
        </QuickCreateModal>
      )}
    </div>
  );
}

/**
 * Modal mínimo: backdrop + panel centrado. Sin shadcn/ui Dialog para no
 * agregar deps. Maneja Escape y click fuera.
 */
function QuickCreateModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-lg">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-[13.5px] font-semibold">{title}</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
