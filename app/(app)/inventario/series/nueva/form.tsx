"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { crearSeriesMasivo } from "../actions";

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
};
type Almacen = {
  id: string;
  codigo: string;
  nombre: string;
  empresa_id: string | null;
};

export function CrearSeriesForm({
  productos,
  almacenes,
}: {
  productos: Producto[];
  almacenes: Almacen[];
}) {
  const router = useRouter();
  const [productoId, setProductoId] = useState("");
  const [almacenId, setAlmacenId] = useState("");
  const [seriesText, setSeriesText] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [garantiaInicio, setGarantiaInicio] = useState("");
  const [garantiaMeses, setGarantiaMeses] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    insertadas: number;
    duplicadas: number;
    duplicadosLista: string[];
  } | null>(null);

  // Detectar series del textarea: cada línea o coma o tab cuenta.
  const numeros = useMemo(() => {
    return Array.from(
      new Set(
        seriesText
          .split(/[\n,;\t]/)
          .map((s) => s.trim().toUpperCase())
          .filter((s) => s.length > 0),
      ),
    );
  }, [seriesText]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    if (!productoId) {
      setError("Selecciona un producto.");
      return;
    }
    if (numeros.length === 0) {
      setError("Captura al menos un número de serie.");
      return;
    }
    startTransition(async () => {
      const r = await crearSeriesMasivo({
        productoId,
        almacenId: almacenId || null,
        numerosSerie: numeros,
        fechaCompra: fechaCompra || null,
        garantiaInicio: garantiaInicio || null,
        garantiaMeses: garantiaMeses ? Number(garantiaMeses) : null,
        observaciones: observaciones.trim() || null,
      });
      if (!r.ok && r.insertadas === 0) {
        setError(r.error ?? "Error al registrar");
        return;
      }
      setResultado({
        insertadas: r.insertadas,
        duplicadas: r.duplicadas,
        duplicadosLista: r.duplicadosLista,
      });
      // Limpiar solo el textarea para que puedan pegar otra tanda si quieren
      setSeriesText("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="space-y-3 rounded-md border border-border bg-card p-5">
        <h2 className="text-[14px] font-semibold">Producto y almacén</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="producto">Producto *</Label>
            <select
              id="producto"
              required
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Elige producto —</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre}
                  {p.marca && ` (${p.marca}${p.modelo ? ` ${p.modelo}` : ""})`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="almacen">Almacén (opcional)</Label>
            <select
              id="almacen"
              value={almacenId}
              onChange={(e) => setAlmacenId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Sin asignar a almacén —</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} — {a.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-border bg-card p-5">
        <h2 className="text-[14px] font-semibold">Números de serie</h2>
        <p className="text-[12px] text-muted-foreground">
          Pega los números separados por <em>línea, coma, punto y coma o
          tab</em>. Mayúsculas/minúsculas se normalizan. Duplicados internos
          se eliminan automáticamente.
        </p>
        <textarea
          rows={8}
          value={seriesText}
          onChange={(e) => setSeriesText(e.target.value)}
          placeholder={`JA-1234567890\nJA-1234567891\nJA-1234567892\n…`}
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-[11.5px] text-muted-foreground">
          {numeros.length} número{numeros.length === 1 ? "" : "s"} detectado
          {numeros.length === 1 ? "" : "s"}.
        </p>
      </section>

      <section className="space-y-3 rounded-md border border-border bg-card p-5">
        <h2 className="text-[14px] font-semibold">
          Compra y garantía (opcional)
        </h2>
        <p className="text-[12px] text-muted-foreground">
          Aplican a TODOS los números registrados en esta pasada. Si tu lote
          tiene fechas distintas, regístralos en pasadas separadas.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="fc">Fecha de compra</Label>
            <Input
              id="fc"
              type="date"
              value={fechaCompra}
              onChange={(e) => setFechaCompra(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gi">Inicio garantía</Label>
            <Input
              id="gi"
              type="date"
              value={garantiaInicio}
              onChange={(e) => setGarantiaInicio(e.target.value)}
              placeholder={fechaCompra}
            />
            <p className="text-[10.5px] text-muted-foreground">
              Default = fecha de compra
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gm">Garantía (meses)</Label>
            <Input
              id="gm"
              type="number"
              min="0"
              max="600"
              value={garantiaMeses}
              onChange={(e) => setGarantiaMeses(e.target.value)}
              placeholder="120 (paneles JA Solar)"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-md border border-border bg-card p-5">
        <Label htmlFor="obs">Observaciones</Label>
        <textarea
          id="obs"
          rows={2}
          maxLength={500}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Lote 2026-A, OC-2026-0123, etc."
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </section>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {resultado && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            {resultado.insertadas} serie
            {resultado.insertadas === 1 ? "" : "s"} registrada
            {resultado.insertadas === 1 ? "" : "s"}.
          </p>
          {resultado.duplicadas > 0 && (
            <div className="mt-2 text-[12.5px] text-amber-900">
              <p>
                <strong>{resultado.duplicadas}</strong> ya estaban
                registradas y se omitieron:
              </p>
              <ul className="mt-1 list-disc pl-5 font-mono text-[11.5px]">
                {resultado.duplicadosLista.slice(0, 10).map((n) => (
                  <li key={n}>{n}</li>
                ))}
                {resultado.duplicadosLista.length > 10 && (
                  <li>... +{resultado.duplicadosLista.length - 10} más</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button asChild type="button" variant="ghost">
          <a href="/inventario/series">Cancelar</a>
        </Button>
        <Button
          type="submit"
          disabled={pending || !productoId || numeros.length === 0}
        >
          {pending ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Registrando…
            </>
          ) : (
            `Registrar ${numeros.length} serie${numeros.length === 1 ? "" : "s"}`
          )}
        </Button>
      </div>
    </form>
  );
}
