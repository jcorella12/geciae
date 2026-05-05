import type { EmpresaMarca } from "@/lib/proyectos/marca";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

/**
 * Encabezado consistente para documentos al cliente (cotizaciones, contratos,
 * reportes). Muestra la marca visible. Si la marca difiere de la empresa
 * operativa fiscal (ej. Limson opera bajo marca PSE), se muestra una línea
 * fina al pie indicando la empresa fiscal.
 *
 * NO se usa para CFDIs (que siempre llevan la empresa fiscal directamente).
 */
export function EncabezadoDocumento({
  marca,
  empresaFiscal,
  difieren,
  titulo,
  subtitulo,
}: {
  marca: EmpresaMarca | null;
  empresaFiscal: EmpresaMarca | null;
  difieren: boolean;
  titulo?: string;
  subtitulo?: string;
}) {
  if (!marca) return null;
  return (
    <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              codigoColor[marca.codigo] ?? "bg-muted-foreground"
            }`}
            aria-label={`Marca ${marca.codigo}`}
          />
          <div>
            <p className="text-base font-semibold">
              {marca.nombre_comercial ?? marca.razon_social}
            </p>
            <p className="text-xs text-muted-foreground">
              RFC {marca.rfc}
            </p>
          </div>
        </div>
        {titulo && (
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-wide">
              {titulo}
            </p>
            {subtitulo && (
              <p className="text-xs text-muted-foreground">{subtitulo}</p>
            )}
          </div>
        )}
      </div>
      {difieren && empresaFiscal && empresaFiscal.id !== marca.id && (
        <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          Operado por <strong>{empresaFiscal.razon_social}</strong> (RFC{" "}
          {empresaFiscal.rfc}) bajo marca {marca.codigo}.
        </p>
      )}
    </header>
  );
}
