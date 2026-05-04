"use client";

import {
  Briefcase,
  Search,
  Truck,
  UserCircle2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Cliente = {
  id: string;
  razon_social: string;
  nombre_comercial: string | null;
  rfc: string;
  tipo: string | null;
};
type Proveedor = {
  id: string;
  razon_social: string;
  nombre_comercial: string | null;
  rfc: string;
  semaforo: string | null;
};
type Empleado = {
  id: string;
  nombre_completo: string;
  curp: string;
  numero_empleado: string;
  puesto: string;
  empresas: { codigo: string } | null;
};

type Results = {
  clientes: Cliente[];
  proveedores: Proveedor[];
  empleados: Empleado[];
};

const empty: Results = { clientes: [], proveedores: [], empleados: [] };

const semaforoBadge: Record<string, string> = {
  verde: "bg-success/15 text-success",
  amarillo: "bg-warning/15 text-foreground",
  rojo: "bg-destructive/15 text-destructive",
  negro: "bg-foreground/10 text-foreground",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(empty);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Atajo global Ctrl+K / Cmd+K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((p) => !p);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      } else if (e.key === "/" && !open) {
        const t = e.target as HTMLElement | null;
        if (
          t?.tagName !== "INPUT" &&
          t?.tagName !== "TEXTAREA" &&
          !t?.isContentEditable
        ) {
          e.preventDefault();
          setOpen(true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus al abrir.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQ("");
      setResults(empty);
    }
  }, [open]);

  // Búsqueda con debounce + abort.
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(empty);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setResults(empty);
          return;
        }
        const data = (await res.json()) as Results;
        setResults(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults(empty);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  const total =
    results.clientes.length +
    results.proveedores.length +
    results.empleados.length;

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-[34px] w-[320px] items-center gap-2 rounded-md border border-border bg-bg-2 px-3 text-[13px] text-ink-3 transition hover:border-border-strong hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
        aria-label="Buscar (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">
          Buscar proyectos, OC, personas…
        </span>
        <kbd className="rounded border border-border bg-surface px-1.5 py-px font-mono text-[10px] text-ink-4">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-2 text-ink-3 hover:bg-bg-3 sm:hidden"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/30 p-4 sm:p-16"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar clientes, proveedores, empleados…"
                className="h-8 border-0 px-1 text-base shadow-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {q.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Escribe al menos 2 caracteres para buscar.
                </p>
              ) : loading && total === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Buscando…
                </p>
              ) : total === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Sin resultados para «{q}».
                </p>
              ) : (
                <>
                  {results.clientes.length > 0 && (
                    <Group title="Clientes" icon={Briefcase}>
                      {results.clientes.map((c) => (
                        <ResultButton
                          key={c.id}
                          onClick={() => navigate(`/clientes/${c.id}`)}
                          primary={c.razon_social}
                          secondary={
                            <>
                              <code className="font-mono">{c.rfc}</code>
                              {c.tipo && <> · {c.tipo}</>}
                              {c.nombre_comercial && <> · {c.nombre_comercial}</>}
                            </>
                          }
                        />
                      ))}
                    </Group>
                  )}
                  {results.proveedores.length > 0 && (
                    <Group title="Proveedores" icon={Truck}>
                      {results.proveedores.map((p) => (
                        <ResultButton
                          key={p.id}
                          onClick={() => navigate(`/finanzas/proveedores/${p.id}`)}
                          primary={p.razon_social}
                          secondary={
                            <span className="flex items-center gap-2">
                              <code className="font-mono">{p.rfc}</code>
                              {p.semaforo && (
                                <span
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px]",
                                    semaforoBadge[p.semaforo] ?? "bg-secondary",
                                  )}
                                >
                                  {p.semaforo}
                                </span>
                              )}
                              {p.nombre_comercial && <> · {p.nombre_comercial}</>}
                            </span>
                          }
                        />
                      ))}
                    </Group>
                  )}
                  {results.empleados.length > 0 && (
                    <Group title="Empleados" icon={UserCircle2}>
                      {results.empleados.map((e) => (
                        <ResultButton
                          key={e.id}
                          onClick={() => navigate(`/personas/${e.id}`)}
                          primary={e.nombre_completo}
                          secondary={
                            <>
                              {e.puesto} · #{e.numero_empleado}
                              {e.empresas?.codigo && <> · {e.empresas.codigo}</>}
                            </>
                          }
                        />
                      ))}
                    </Group>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">
              <span>
                <kbd className="rounded bg-card px-1 font-mono">↵</kbd> abrir
              </span>
              <span>
                <kbd className="rounded bg-card px-1 font-mono">esc</kbd> cerrar
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="px-1 py-1">
      <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function ResultButton({
  onClick,
  primary,
  secondary,
}: {
  onClick: () => void;
  primary: string;
  secondary?: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-none"
      >
        <span className="font-medium">{primary}</span>
        {secondary && (
          <span className="text-xs text-muted-foreground">{secondary}</span>
        )}
      </button>
    </li>
  );
}
