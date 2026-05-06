/**
 * Server Component que renderiza la página de widgets con datos reales.
 * El customizer (picker) se monta aparte como Client Component.
 */

import { obtenerPreferenciasUsuario } from "@/app/(app)/mi-dia/widget-actions";
import { widgetPorId } from "@/lib/widgets/catalogo";

import { WidgetCard } from "./widget-card";
import { renderizarWidget } from "./registry";
import { WidgetCustomizer } from "./widget-customizer";

export async function WidgetPageShell({
  pagina,
}: {
  pagina: "mi-dia" | "dashboard";
}) {
  const { layout } = await obtenerPreferenciasUsuario(pagina);
  const visibles = layout.filter((l) => l.visible).sort((a, b) => a.orden - b.orden);

  // Renderizar cada widget en paralelo
  const renderedWidgets = await Promise.all(
    visibles.map(async (entry) => {
      const meta = widgetPorId(entry.widget_id);
      if (!meta) return null;
      const content = await renderizarWidget(entry.widget_id);
      return (
        <WidgetCard
          key={entry.widget_id}
          titulo={meta.nombre}
          tamaño={entry.tamaño}
        >
          {content}
        </WidgetCard>
      );
    }),
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <WidgetCustomizer pagina={pagina} layoutInicial={layout} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {renderedWidgets}
      </div>
      {visibles.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-ink-3">
            Sin widgets visibles. Personaliza tu tablero arriba.
          </p>
        </div>
      )}
    </div>
  );
}
