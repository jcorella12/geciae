"use client";

import {
  ArrowRight,
  Loader2,
  Search,
  X,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { cn } from "@/lib/utils";

import type { PeekData } from "@/app/api/peek/[code]/route";
import type { CmdkResult } from "@/app/api/cmdk/route";

// ============================================================================
// Context
// ============================================================================

type PeekContextValue = {
  open: (code: string) => void;
  close: () => void;
  openCmdk: () => void;
};

const PeekContext = createContext<PeekContextValue | null>(null);

export function usePeek(): PeekContextValue {
  const ctx = useContext(PeekContext);
  if (!ctx) {
    // No-op fallback si se usa fuera del provider
    return {
      open: () => {},
      close: () => {},
      openCmdk: () => {},
    };
  }
  return ctx;
}

// ============================================================================
// Provider — panel + cmdk + atajos teclado
// ============================================================================

export function PeekProvider({ children }: { children: React.ReactNode }) {
  const [peekCode, setPeekCode] = useState<string | null>(null);
  const [cmdkOpen, setCmdkOpen] = useState(false);

  const open = useCallback((code: string) => setPeekCode(code), []);
  const close = useCallback(() => setPeekCode(null), []);
  const openCmdk = useCallback(() => setCmdkOpen(true), []);

  // Atajo global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
      if (e.key === "Escape") {
        if (peekCode) close();
        if (cmdkOpen) setCmdkOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [peekCode, cmdkOpen, close]);

  return (
    <PeekContext.Provider value={{ open, close, openCmdk }}>
      {children}
      <SidePeekPanel code={peekCode} onClose={close} />
      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onOpenPeek={open}
      />
    </PeekContext.Provider>
  );
}

// ============================================================================
// <Ref> — referencia clickable que abre el side peek
// ============================================================================

export function Ref({
  code,
  children,
  className,
}: {
  code: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { open } = usePeek();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        open(code);
      }}
      className={cn(
        "inline cursor-pointer border-b border-dashed border-brand/40 px-0.5 py-px transition hover:border-brand hover:bg-brand-soft hover:text-brand-deep",
        className,
      )}
    >
      {children ?? code}
    </button>
  );
}

// ============================================================================
// Side Peek Panel
// ============================================================================

const STATUS_COLORS: Record<PeekData["status"], string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  neutral: "bg-zinc-400",
};

function SidePeekPanel({
  code,
  onClose,
}: {
  code: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<PeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/peek/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          setError(j.error);
          setData(null);
        } else {
          setData(j as PeekData);
        }
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[90] bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-200",
          code
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed bottom-0 right-0 top-0 z-[100] flex w-[440px] max-w-[92vw] flex-col border-l border-border bg-card shadow-[-16px_0_40px_-12px_rgba(15,23,42,0.12)] transition-transform duration-200",
          code ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!code}
      >
        {loading && (
          <div className="flex flex-1 items-center justify-center text-ink-3">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-ink-3">
            <p className="text-sm">{error}</p>
            <button
              onClick={onClose}
              className="text-[12px] text-brand hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}
        {data && !loading && (
          <>
            <div className="relative border-b border-divider px-6 py-5">
              <button
                onClick={onClose}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-bg-2"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    STATUS_COLORS[data.status],
                  )}
                />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  {data.kind} · {data.statusLabel}
                </span>
              </div>
              <h2 className="text-[18px] font-semibold leading-tight tracking-[-0.01em]">
                {data.title}
              </h2>
              {data.sub && (
                <p className="mt-1 text-[12px] text-ink-3">{data.sub}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-px border-b border-divider bg-divider">
              {data.stats.map((s, i) => (
                <div key={i} className="bg-card px-5 py-3.5">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {s.l}
                  </div>
                  <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums tracking-[-0.02em]">
                    {s.v}
                  </div>
                  {s.d && (
                    <div
                      className={cn(
                        "mt-0.5 text-[11px]",
                        s.dir === "up"
                          ? "text-emerald-700"
                          : s.dir === "down"
                            ? "text-red-700"
                            : "text-ink-3",
                      )}
                    >
                      {s.dir === "up" ? "▲" : s.dir === "down" ? "▼" : "·"}{" "}
                      {s.d}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {data.sections.map((sec, i) => (
                <div
                  key={i}
                  className={cn(
                    i > 0 && "mt-5 border-t border-divider pt-5",
                  )}
                >
                  <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {sec.t}
                  </h3>
                  <ul className="space-y-1.5">
                    {sec.items.map((it, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-[12.5px]"
                      >
                        <span className="mt-1 text-ink-4">›</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {data.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-divider bg-bg-2 px-5 py-3">
                {data.actions.map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    onClick={onClose}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium",
                      a.primary
                        ? "border-brand bg-brand text-brand-fg hover:opacity-90"
                        : "border-border bg-card text-ink-2 hover:bg-bg-3",
                    )}
                  >
                    {a.label}
                    {a.primary && <ArrowRight className="h-3.5 w-3.5" />}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}

// ============================================================================
// Command Palette ⌘K
// ============================================================================

const STATIC_GROUPS: { group: string; items: { id: string; title: string; subtitle?: string; href?: string; kbd?: string }[] }[] = [
  {
    group: "IR A",
    items: [
      { id: "go-mid", title: "Mi día", href: "/mi-dia", kbd: "G M" },
      { id: "go-cal", title: "Calendario", href: "/calendario", kbd: "G C" },
      { id: "go-dash", title: "Dashboard ejecutivo", href: "/dashboard", kbd: "G D" },
      { id: "go-prj", title: "Proyectos", href: "/proyectos", kbd: "G P" },
      { id: "go-inv", title: "Inventario", href: "/inventario", kbd: "G I" },
      { id: "go-oc", title: "Compras (OC)", href: "/finanzas/oc", kbd: "G O" },
      { id: "go-cfdi", title: "CFDI", href: "/finanzas/cfdi", kbd: "G F" },
      { id: "go-veh", title: "Vehículos", href: "/activos/vehiculos", kbd: "G V" },
      { id: "go-tic", title: "Tickets soporte", href: "/soporte/tickets", kbd: "G T" },
      { id: "go-cli", title: "Clientes", href: "/clientes" },
      { id: "go-pro", title: "Proveedores", href: "/finanzas/proveedores" },
      { id: "go-tes", title: "Tesorería", href: "/finanzas/tesoreria" },
      { id: "go-not", title: "Notificaciones", href: "/notificaciones" },
    ],
  },
  {
    group: "CREAR",
    items: [
      { id: "n-prj", title: "Crear proyecto…", href: "/proyectos/nuevo", kbd: "C P" },
      { id: "n-oc", title: "Crear orden de compra…", href: "/finanzas/oc/nueva", kbd: "C O" },
      { id: "n-cfdi", title: "Registrar CFDI…", href: "/finanzas/cfdi/nuevo" },
      { id: "n-tic", title: "Nuevo ticket…", href: "/soporte/tickets/nuevo", kbd: "C T" },
      { id: "n-veh", title: "Nuevo vehículo…", href: "/activos/vehiculos/nuevo" },
      { id: "n-inv", title: "Nuevo item inventario…", href: "/inventario/nuevo" },
      { id: "n-mov", title: "Movimiento inventario…", href: "/inventario/movimientos/nuevo" },
      { id: "n-op", title: "Nueva oportunidad…", href: "/comercial/oportunidades/nueva" },
      { id: "n-cli", title: "Nuevo cliente…", href: "/clientes/nuevo" },
    ],
  },
];

function CommandPalette({
  open,
  onClose,
  onOpenPeek,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPeek: (code: string) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<CmdkResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setQ("");
      setSelected(0);
      setSearchResults([]);
    }
  }, [open]);

  // Búsqueda debounced
  useEffect(() => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/cmdk?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j) => setSearchResults(j.results ?? []))
        .catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Items planos: estáticos filtrados + resultados dinámicos
  const flat = useMemo(() => {
    const groups: typeof STATIC_GROUPS = [];
    if (!q || q.length < 2) {
      groups.push(...STATIC_GROUPS);
    } else {
      const ql = q.toLowerCase();
      // Filtrar estáticos
      for (const g of STATIC_GROUPS) {
        const items = g.items.filter((it) =>
          it.title.toLowerCase().includes(ql),
        );
        if (items.length > 0) groups.push({ group: g.group, items });
      }
      // Agrupar resultados dinámicos
      const byGroup: Record<string, CmdkResult[]> = {};
      for (const r of searchResults) {
        if (!byGroup[r.group]) byGroup[r.group] = [];
        byGroup[r.group].push(r);
      }
      Object.keys(byGroup).forEach((groupName) => {
        groups.push({
          group: groupName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: byGroup[groupName].map((r: CmdkResult) => ({
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            href: r.href,
            refCode: r.refCode,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          })) as any,
        });
      });
    }
    return groups;
  }, [q, searchResults]);

  const total = flat.reduce((a, g) => a + g.items.length, 0);

  useEffect(() => {
    setSelected(0);
  }, [q, total]);

  const handleSelect = useCallback(
    (item: { id: string; href?: string; title: string; subtitle?: string } & { refCode?: string }) => {
      onClose();
      // Si es entidad con refCode, abrir peek; de lo contrario navegar
      if (item.refCode) {
        onOpenPeek(item.refCode);
      } else if (item.href) {
        startTransition(() => router.push(item.href!));
      }
    },
    [onClose, onOpenPeek, router],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(total - 1, s + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        let i = 0;
        for (const g of flat) {
          for (const it of g.items) {
            if (i === selected) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleSelect(it as any);
              return;
            }
            i++;
          }
        }
      }
    },
    [flat, selected, total, handleSelect],
  );

  if (!open) return null;

  let idx = -1;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-900/45 px-4 pt-[14vh] backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        style={{ maxHeight: "70vh" }}
      >
        <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            autoFocus
            placeholder="Buscar acciones, proyectos, OC, clientes, tickets…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-ink-4"
          />
          <span className="rounded border border-border bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
            ESC
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {flat.length === 0 && (
            <p className="px-4 py-10 text-center text-[13px] text-ink-3">
              {q.length >= 2 ? (
                <>
                  Sin resultados para <strong>&ldquo;{q}&rdquo;</strong>
                </>
              ) : (
                "Empieza a escribir para buscar…"
              )}
            </p>
          )}

          {flat.map((g) => (
            <div key={g.group} className="py-1.5">
              <div className="px-3.5 pb-1 pt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                {g.group}
              </div>
              {g.items.map((it) => {
                idx++;
                const active = idx === selected;
                const myIdx = idx;
                return (
                  <button
                    key={it.id}
                    onMouseEnter={() => setSelected(myIdx)}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => handleSelect(it as any)}
                    className={cn(
                      "mx-1 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-md px-3 py-2 text-left transition",
                      active
                        ? "bg-brand-soft text-brand-deep"
                        : "hover:bg-bg-2",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px]",
                        active
                          ? "bg-card text-brand"
                          : "bg-bg-3 text-ink-2",
                      )}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">
                        {it.title}
                      </div>
                      {it.subtitle && (
                        <div className="mt-0.5 truncate text-[11.5px] text-ink-3">
                          {it.subtitle}
                        </div>
                      )}
                    </div>
                    {it.kbd && (
                      <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
                        {it.kbd}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-divider bg-bg-2 px-4 py-2 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">
              ↑↓
            </span>
            navegar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">
              ↵
            </span>
            abrir
          </span>
          <span className="ml-auto">
            Tip: <kbd className="rounded bg-bg-3 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd> abre/cierra
          </span>
        </div>
      </div>
    </div>
  );
}
