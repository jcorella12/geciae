import {
  ETIQUETA_TIPO_AJUSTE,
  type AjusteTotalesRow,
  type NaturalezaAjuste,
  type TipoAjusteGerencial,
} from "@/lib/ajustes-gerenciales/state";

const fmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const TITULOS_NATURALEZA: Record<NaturalezaAjuste, string> = {
  activo: "Activos no registrados (ocultos)",
  pasivo: "Pasivos no registrados",
  capital: "Capital no formalizado",
};

const COLORES_NATURALEZA: Record<NaturalezaAjuste, string> = {
  activo: "border-sky-200 bg-sky-50",
  pasivo: "border-amber-200 bg-amber-50",
  capital: "border-emerald-200 bg-emerald-50",
};

export function TablaVistaDual({ totales }: { totales: AjusteTotalesRow[] }) {
  const porNaturaleza = totales.reduce<Record<NaturalezaAjuste, AjusteTotalesRow[]>>(
    (acc, t) => {
      if (!acc[t.naturaleza]) acc[t.naturaleza] = [];
      acc[t.naturaleza].push(t);
      return acc;
    },
    { activo: [], pasivo: [], capital: [] },
  );

  const totalActivos = porNaturaleza.activo.reduce(
    (s, t) => s + Number(t.valor_en_libros_total ?? 0),
    0,
  );
  const totalPasivos = porNaturaleza.pasivo.reduce(
    (s, t) => s + Number(t.valor_total ?? 0),
    0,
  );
  const totalCapital = porNaturaleza.capital.reduce(
    (s, t) => s + Number(t.valor_total ?? 0),
    0,
  );

  if (totales.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-[13px] text-ink-3">
        No hay ajustes vigentes registrados todavía.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {(["activo", "pasivo", "capital"] as NaturalezaAjuste[]).map(
        (naturaleza) => {
          const items = porNaturaleza[naturaleza] ?? [];
          if (items.length === 0) return null;
          const total =
            naturaleza === "activo"
              ? totalActivos
              : naturaleza === "pasivo"
                ? totalPasivos
                : totalCapital;

          return (
            <section
              key={naturaleza}
              className={`rounded-md border p-5 ${COLORES_NATURALEZA[naturaleza]}`}
            >
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">
                  {TITULOS_NATURALEZA[naturaleza]}
                </h2>
                <span className="font-mono text-[20px] font-semibold tnum">
                  {fmt.format(total)}
                </span>
              </header>

              <div className="space-y-1.5">
                {items
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(b.valor_en_libros_total) - Number(a.valor_en_libros_total),
                  )
                  .map((t) => (
                    <div
                      key={t.tipo}
                      className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2"
                    >
                      <div>
                        <div className="text-[12.5px] font-medium">
                          {ETIQUETA_TIPO_AJUSTE[t.tipo as TipoAjusteGerencial]}
                        </div>
                        <div className="text-[10.5px] text-ink-3">
                          {Number(t.num_ajustes)} ajuste
                          {Number(t.num_ajustes) !== 1 ? "s" : ""}
                          {naturaleza === "activo" &&
                            " · valor en libros (con depreciación)"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[13px] font-medium tnum">
                          {fmt.format(Number(t.valor_en_libros_total))}
                        </div>
                        {naturaleza === "activo" &&
                          Number(t.valor_total) !==
                            Number(t.valor_en_libros_total) && (
                            <div className="text-[10.5px] text-ink-3">
                              Original: {fmt.format(Number(t.valor_total))}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          );
        },
      )}

      {/* Patrimonio neto resultante */}
      <div className="rounded-md border-2 border-brand bg-brand/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">
              Impacto neto al patrimonio
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-3">
              Activos en libros − Pasivos no registrados + Capital no formalizado
            </p>
          </div>
          <div className="font-mono text-[28px] font-semibold tnum">
            {fmt.format(totalActivos - totalPasivos + totalCapital)}
          </div>
        </div>
        <p className="mt-3 text-[11.5px] text-ink-3">
          Esta cantidad NO está reflejada en tus estados financieros fiscales del
          despacho. Es la diferencia entre tu patrimonio fiscal y tu patrimonio
          real.
        </p>
      </div>
    </div>
  );
}
