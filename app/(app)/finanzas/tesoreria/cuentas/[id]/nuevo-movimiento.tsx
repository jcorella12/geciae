"use client";

import {
  ArrowDownToLine,
  FileSpreadsheet,
  FileUp,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initialImportCSVState,
  initialMovimientoManualState,
} from "@/lib/bancos-movimientos/state";

import { EdoctaUploader } from "./edocta-uploader";
import {
  crearMovimientoManual,
  importarMovimientosCSV,
} from "./movimientos-actions";

/**
 * Dropdown "+ Nuevo movimiento" con tres caminos:
 *  - Captura manual (modal con form)
 *  - Subir CSV (modal con uploader + resumen)
 *  - Subir estado de cuenta (lleva al uploader IA existente — solo scroll)
 */
export function NuevoMovimientoButton({
  cuentaId,
  puedeSubirEdocta = true,
}: {
  cuentaId: string;
  puedeSubirEdocta?: boolean;
}) {
  const [openMenu, setOpenMenu] = useState(false);
  const [openManual, setOpenManual] = useState(false);
  const [openCSV, setOpenCSV] = useState(false);
  const [openEdocta, setOpenEdocta] = useState(false);

  return (
    <>
      <div className="relative inline-block">
        <Button
          size="sm"
          onClick={() => setOpenMenu((o) => !o)}
          aria-expanded={openMenu}
          aria-haspopup="menu"
        >
          <Plus className="h-4 w-4" />
          Nuevo movimiento
        </Button>
        {openMenu && (
          <>
            {/* Click fuera */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpenMenu(false)}
            />
            <div
              role="menu"
              className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-md border border-border bg-card shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenu(false);
                  setOpenManual(true);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] hover:bg-bg-2"
              >
                <ArrowDownToLine className="mt-0.5 h-4 w-4 text-ink-3" />
                <span>
                  <span className="block font-medium">Capturar manual</span>
                  <span className="block text-[11px] text-ink-3">
                    Depósito en efectivo, comisión, etc.
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenu(false);
                  setOpenCSV(true);
                }}
                className="flex w-full items-start gap-2 border-t border-border px-3 py-2 text-left text-[13px] hover:bg-bg-2"
              >
                <FileSpreadsheet className="mt-0.5 h-4 w-4 text-ink-3" />
                <span>
                  <span className="block font-medium">
                    Importar CSV / .exp
                  </span>
                  <span className="block text-[11px] text-ink-3">
                    Bulk: lista de movimientos exportada del banco (BBVA .exp,
                    CSV, TSV).
                  </span>
                </span>
              </button>
              {puedeSubirEdocta && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenMenu(false);
                    setOpenEdocta(true);
                  }}
                  className="flex w-full items-start gap-2 border-t border-border px-3 py-2 text-left text-[13px] hover:bg-bg-2"
                >
                  <FileUp className="mt-0.5 h-4 w-4 text-ink-3" />
                  <span>
                    <span className="block font-medium">
                      Subir estado de cuenta
                    </span>
                    <span className="block text-[11px] text-ink-3">
                      PDF mensual o .exp · arrastra o selecciona (drag &amp; drop).
                    </span>
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {openManual && (
        <ManualForm
          cuentaId={cuentaId}
          onClose={() => setOpenManual(false)}
        />
      )}
      {openCSV && (
        <CSVForm cuentaId={cuentaId} onClose={() => setOpenCSV(false)} />
      )}
      {openEdocta && (
        <EdoctaModal
          cuentaId={cuentaId}
          onClose={() => setOpenEdocta(false)}
        />
      )}
    </>
  );
}

/**
 * Modal con drag-and-drop para subir estado de cuenta (PDF o .exp).
 * Reusa EdoctaUploader (que ya implementa el drag/drop + procesar IA/.exp).
 */
function EdoctaModal({
  cuentaId,
  onClose,
}: {
  cuentaId: string;
  onClose: () => void;
}) {
  return (
    <Modal title="Subir estado de cuenta" onClose={onClose} width="xl">
      <div className="space-y-3">
        <p className="text-[11.5px] text-ink-3">
          Arrastra un archivo PDF mensual (BBVA Maestra PYME) o .exp
          (export TSV diario) sobre el área de abajo, o haz click para
          seleccionarlo. La IA leerá el PDF; el .exp se procesa al instante.
        </p>
        <EdoctaUploader cuentaId={cuentaId} />
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
  width = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl";
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
      <div
        className={`w-full ${
          width === "xl"
            ? "max-w-2xl"
            : width === "lg"
              ? "max-w-lg"
              : "max-w-md"
        } rounded-lg border border-border bg-card shadow-lg`}
      >
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

function ManualForm({
  cuentaId,
  onClose,
}: {
  cuentaId: string;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(
    crearMovimientoManual,
    initialMovimientoManualState,
  );
  const [tipo, setTipo] = useState<"abono" | "cargo">("abono");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal title="Capturar movimiento manual" onClose={onClose}>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="cuenta_id" value={cuentaId} />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="mm_fecha" className="text-[11.5px]">
              Fecha *
            </Label>
            <Input
              id="mm_fecha"
              name="fecha"
              type="date"
              defaultValue={today}
              required
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mm_fecha_apl" className="text-[11.5px]">
              Fecha aplicación
            </Label>
            <Input
              id="mm_fecha_apl"
              name="fecha_aplicacion"
              type="date"
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mm_concepto" className="text-[11.5px]">
            Concepto *
          </Label>
          <Input
            id="mm_concepto"
            name="concepto"
            required
            maxLength={500}
            placeholder="Depósito en efectivo / Comisión SPEI"
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="mm_referencia" className="text-[11.5px]">
            Referencia
          </Label>
          <Input
            id="mm_referencia"
            name="referencia"
            maxLength={100}
            placeholder="Folio interno, # SPEI, etc."
            className="h-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="mm_tipo" className="text-[11.5px]">
              Tipo *
            </Label>
            <select
              id="mm_tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "abono" | "cargo")}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="abono">Abono (entrada)</option>
              <option value="cargo">Cargo (salida)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mm_monto" className="text-[11.5px]">
              Monto (MXN) *
            </Label>
            <Input
              id="mm_monto"
              name="monto"
              type="number"
              min="0.01"
              step="0.01"
              required
              className="h-9 font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mm_obs" className="text-[11.5px]">
            Observaciones
          </Label>
          <textarea
            id="mm_obs"
            name="observaciones"
            rows={2}
            maxLength={500}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {state.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
            {state.error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <ManualSubmit />
        </div>
      </form>
    </Modal>
  );
}

function ManualSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar movimiento"}
    </Button>
  );
}

function CSVForm({
  cuentaId,
  onClose,
}: {
  cuentaId: string;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(
    importarMovimientosCSV,
    initialImportCSVState,
  );
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [, startTransition] = useTransition();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setArchivo(f);
    setPreview([]);
    if (!f) return;
    startTransition(async () => {
      const text = await f.text();
      const lineas = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .slice(0, 6);
      const sep =
        (lineas[0]?.match(/;/g)?.length ?? 0) >
        (lineas[0]?.match(/,/g)?.length ?? 0)
          ? ";"
          : ",";
      setPreview(
        lineas.map((l) =>
          l.split(sep).map((c) => c.replace(/^"|"$/g, "").slice(0, 30)),
        ),
      );
    });
  };

  return (
    <Modal title="Importar movimientos desde CSV" onClose={onClose}>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="cuenta_id" value={cuentaId} />

        <p className="text-[11.5px] text-ink-3">
          Formato esperado: encabezado + filas con columnas{" "}
          <code className="font-mono">fecha</code> (o{" "}
          <code className="font-mono">día</code>),{" "}
          <code className="font-mono">concepto</code>, y al menos una de{" "}
          <code className="font-mono">cargo</code>/
          <code className="font-mono">abono</code> o{" "}
          <code className="font-mono">monto</code> (con signo). Separador:
          coma, punto y coma o tabulación. Acepta CSV y .exp/TSV (export de
          BBVA Net).
        </p>

        <div className="space-y-1">
          <Label htmlFor="csv_file" className="text-[11.5px]">
            Archivo CSV o .exp
          </Label>
          <Input
            id="csv_file"
            name="archivo"
            type="file"
            accept=".csv,.exp,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            onChange={onFile}
            required
            className="h-9 file:mr-2 file:rounded file:border-0 file:bg-bg-2 file:px-2 file:py-1 file:text-[11px]"
          />
          {archivo && (
            <p className="text-[10.5px] text-ink-3">
              {archivo.name} · {(archivo.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border bg-bg-2/40 p-2">
            <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wider text-ink-3">
              Vista previa (primeras filas)
            </p>
            <table className="text-[10.5px]">
              <tbody>
                {preview.map((fila, i) => (
                  <tr key={i} className={i === 0 ? "font-semibold" : ""}>
                    {fila.map((c, j) => (
                      <td key={j} className="px-1.5 py-0.5">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {state.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
            {state.error}
          </p>
        )}

        {state.ok && (
          <div className="rounded-md border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-[12px]">
            <p className="font-medium text-emerald-900">
              Import completado · {state.importados} importados
              {state.duplicados !== undefined && state.duplicados > 0 && (
                <> · {state.duplicados} duplicados omitidos</>
              )}
            </p>
            {state.errores && state.errores.length > 0 && (
              <details className="mt-1.5 text-emerald-800">
                <summary className="cursor-pointer text-[11px]">
                  {state.errores.length} fila(s) con errores
                </summary>
                <ul className="mt-1 space-y-0.5 text-[10.5px]">
                  {state.errores.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      Fila {e.fila}: {e.mensaje}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {state.ok ? "Cerrar" : "Cancelar"}
          </Button>
          {!state.ok && <CSVSubmit />}
        </div>
      </form>
    </Modal>
  );
}

function CSVSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Importando…" : "Importar"}
    </Button>
  );
}
