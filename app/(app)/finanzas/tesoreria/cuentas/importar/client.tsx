"use client";

import {
  CheckCircle2,
  Database,
  FileText,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/notify";
import { matchCuentaPorNombre, type CuentaMin } from "@/lib/edoctas/auto-match";

import {
  extraerSaldoEdocuentaIA,
  procesarExpFile,
  subirArchivoEdocta,
} from "../[id]/actions";

type Cuenta = CuentaMin & { empresa_id: string };

type FileSlot = {
  /** uuid local */
  uid: string;
  file: File;
  filename: string;
  formato: "pdf" | "exp" | "desconocido";
  cuentaId: string | null;
  /** Pista de match auto (informativo). */
  pistaMatch: string;
  confianza: "alta" | "media" | "baja" | "ninguna";
  status: "pending" | "uploading" | "uploaded" | "processing" | "done" | "error";
  estadoId?: string;
  message?: string;
};

function detectarFormato(filename: string): FileSlot["formato"] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".exp") || lower.endsWith(".tsv") || lower.endsWith(".txt"))
    return "exp";
  return "desconocido";
}

function newUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `f${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const CONFIANZA_BADGE: Record<FileSlot["confianza"], string> = {
  alta: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  media: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  baja: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  ninguna: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const CONFIANZA_LABEL: Record<FileSlot["confianza"], string> = {
  alta: "auto ✓",
  media: "auto",
  baja: "auto (verifica)",
  ninguna: "asigna manual",
};

export function ImportEdoctasClient({ cuentas }: { cuentas: Cuenta[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [slots, setSlots] = useState<FileSlot[]>([]);
  const [isPending, startTransition] = useTransition();

  function agregarArchivos(files: File[]) {
    const nuevos: FileSlot[] = files.map((f) => {
      const formato = detectarFormato(f.name);
      const match = matchCuentaPorNombre(f.name, cuentas);
      return {
        uid: newUid(),
        file: f,
        filename: f.name,
        formato,
        cuentaId: match.cuentaId,
        pistaMatch: match.pista,
        confianza: match.confianza,
        status: "pending",
      };
    });
    setSlots((prev) => [...prev, ...nuevos]);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length > 0) agregarArchivos(dropped);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) agregarArchivos(selected);
    if (inputRef.current) inputRef.current.value = "";
  }

  function quitar(uid: string) {
    setSlots((prev) => prev.filter((s) => s.uid !== uid));
  }

  function asignarCuenta(uid: string, cuentaId: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.uid === uid
          ? {
              ...s,
              cuentaId: cuentaId || null,
              confianza: cuentaId ? "alta" : "ninguna",
              pistaMatch: cuentaId
                ? "Asignado manualmente"
                : "No se detectó cuenta",
            }
          : s,
      ),
    );
  }

  async function procesarSlot(slot: FileSlot) {
    if (!slot.cuentaId) {
      setSlots((prev) =>
        prev.map((s) =>
          s.uid === slot.uid
            ? { ...s, status: "error", message: "Falta asignar cuenta" }
            : s,
        ),
      );
      return;
    }
    if (slot.formato === "desconocido") {
      setSlots((prev) =>
        prev.map((s) =>
          s.uid === slot.uid
            ? {
                ...s,
                status: "error",
                message: "Formato no soportado (solo .pdf o .exp)",
              }
            : s,
        ),
      );
      return;
    }

    setSlots((prev) =>
      prev.map((s) =>
        s.uid === slot.uid ? { ...s, status: "uploading" } : s,
      ),
    );

    const fd = new FormData();
    fd.append("file", slot.file);
    const r = await subirArchivoEdocta(slot.cuentaId, fd);

    if (!r.ok || !r.estadoId) {
      setSlots((prev) =>
        prev.map((s) =>
          s.uid === slot.uid
            ? {
                ...s,
                status: "error",
                message: r.error ?? "Error al subir",
              }
            : s,
        ),
      );
      return;
    }

    setSlots((prev) =>
      prev.map((s) =>
        s.uid === slot.uid
          ? {
              ...s,
              status: "processing",
              estadoId: r.estadoId ?? undefined,
            }
          : s,
      ),
    );

    // Procesar: PDF con IA, EXP con parser TS.
    if (slot.formato === "pdf") {
      const proc = await extraerSaldoEdocuentaIA(r.estadoId);
      setSlots((prev) =>
        prev.map((s) =>
          s.uid === slot.uid
            ? {
                ...s,
                status: proc.ok ? "done" : "error",
                message: proc.ok
                  ? `✓ Saldo $${(proc.saldo_final ?? 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}${proc.num_movs ? ` · ${proc.num_movs} movs` : ""}`
                  : proc.error ?? "Error IA",
              }
            : s,
        ),
      );
    } else {
      const proc = await procesarExpFile(r.estadoId);
      setSlots((prev) =>
        prev.map((s) =>
          s.uid === slot.uid
            ? {
                ...s,
                status: proc.ok ? "done" : "error",
                message: proc.ok
                  ? `✓ ${proc.movs_insertados} movs · saldo $${(proc.saldo_final ?? 0).toLocaleString(
                      "es-MX",
                      { minimumFractionDigits: 2 },
                    )}`
                  : proc.error ?? "Error parser",
              }
            : s,
        ),
      );
    }
  }

  function procesarTodos() {
    const procesables = slots.filter(
      (s) => s.status === "pending" && s.cuentaId && s.formato !== "desconocido",
    );
    if (procesables.length === 0) {
      notify({
        message:
          "Nada para procesar. Verifica que cada archivo tenga cuenta asignada.",
        variant: "warning",
      });
      return;
    }
    startTransition(async () => {
      // Procesar en serie para no saturar API y para reportar progreso lineal.
      for (const slot of procesables) {
        await procesarSlot(slot);
      }
      router.refresh();
    });
  }

  const pendientes = slots.filter((s) => s.status === "pending").length;
  const conCuenta = slots.filter(
    (s) => s.cuentaId && s.status === "pending",
  ).length;
  const sinCuenta = slots.filter(
    (s) => !s.cuentaId && s.status === "pending",
  ).length;
  const procesados = slots.filter((s) => s.status === "done").length;
  const conError = slots.filter((s) => s.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed transition ${
          dragOver
            ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30"
            : "border-border bg-card hover:bg-bg-2"
        } px-6 py-10 text-center`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.exp,.tsv,.txt,application/pdf,text/plain"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
        <Upload className="mx-auto mb-2 h-6 w-6 text-ink-3" />
        <p className="text-sm font-medium">
          Arrastra varios estados de cuenta aquí o haz clic para seleccionar
        </p>
        <p className="mt-1 text-[12px] text-ink-3">
          <strong>.pdf</strong> (mensual con IA) ·{" "}
          <strong>.exp / .tsv</strong> (movimientos BBVA)
        </p>
        <p className="mt-2 text-[11px] text-ink-3">
          El sistema detecta la cuenta por el nombre del archivo. Si tu banco
          incluye el número de cuenta o el nombre del banco en el nombre, lo
          asigna automáticamente.
        </p>
      </div>

      {/* Resumen */}
      {slots.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-[12px]">
          <span className="font-medium">{slots.length} archivos</span>
          {conCuenta > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              {conCuenta} listos
            </span>
          )}
          {sinCuenta > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {sinCuenta} sin cuenta
            </span>
          )}
          {procesados > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {procesados} procesados
            </span>
          )}
          {conError > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-900/30 dark:text-red-200">
              {conError} con error
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSlots([])}
              disabled={isPending}
            >
              Limpiar todo
            </Button>
            <Button
              size="sm"
              onClick={procesarTodos}
              disabled={isPending || pendientes === 0 || conCuenta === 0}
            >
              {isPending
                ? "Procesando…"
                : `Procesar ${conCuenta}${
                    sinCuenta > 0 ? ` (omitir ${sinCuenta})` : ""
                  }`}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de archivos */}
      {slots.length > 0 && (
        <ul className="space-y-2">
          {slots.map((s) => {
            const cuenta = cuentas.find((c) => c.id === s.cuentaId);
            return (
              <li
                key={s.uid}
                className="rounded-md border border-border bg-card p-3"
              >
                <div className="flex items-start gap-3">
                  <FileText
                    className={`mt-0.5 h-4 w-4 ${
                      s.formato === "pdf"
                        ? "text-blue-600"
                        : s.formato === "exp"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[13px] font-medium">
                        {s.filename}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium ${
                          s.formato === "pdf"
                            ? "bg-blue-100 text-blue-700"
                            : s.formato === "exp"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.formato.toUpperCase()}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium ${CONFIANZA_BADGE[s.confianza]}`}
                        title={s.pistaMatch}
                      >
                        {CONFIANZA_LABEL[s.confianza]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {s.pistaMatch}
                    </p>
                    {/* Selector de cuenta */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="text-[11.5px] text-ink-3">
                        Cuenta destino:
                      </label>
                      <select
                        value={s.cuentaId ?? ""}
                        onChange={(e) => asignarCuenta(s.uid, e.target.value)}
                        disabled={
                          s.status === "uploading" ||
                          s.status === "processing" ||
                          s.status === "done"
                        }
                        className="flex h-7 max-w-[420px] flex-1 rounded-md border border-input bg-background px-2 text-[12px]"
                      >
                        <option value="">— sin asignar —</option>
                        {cuentas.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.empresa_codigo} · {c.banco} · {c.numero_cuenta}
                            {c.alias ? ` (${c.alias})` : ""}
                          </option>
                        ))}
                      </select>
                      {cuenta && (
                        <Link
                          href={`/finanzas/tesoreria/cuentas/${cuenta.id}`}
                          target="_blank"
                          className="text-[11px] text-brand hover:underline"
                        >
                          abrir cuenta →
                        </Link>
                      )}
                    </div>
                    {s.message && (
                      <p
                        className={`mt-1.5 text-[11px] ${
                          s.status === "error"
                            ? "text-destructive"
                            : "text-emerald-700"
                        }`}
                      >
                        {s.message}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {s.status === "pending" && s.cuentaId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => procesarSlot(s)}
                        disabled={isPending}
                      >
                        {s.formato === "pdf" ? (
                          <>
                            <Sparkles className="h-3 w-3" />
                            Procesar
                          </>
                        ) : (
                          <>
                            <Database className="h-3 w-3" />
                            Procesar
                          </>
                        )}
                      </Button>
                    )}
                    {(s.status === "uploading" || s.status === "processing") && (
                      <span className="text-[11px] text-violet-700">
                        {s.status === "uploading" ? "Subiendo…" : "Procesando…"}
                      </span>
                    )}
                    {s.status === "done" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    {s.status !== "uploading" && s.status !== "processing" && (
                      <button
                        type="button"
                        onClick={() => quitar(s.uid)}
                        className="text-ink-4 hover:text-destructive"
                        title="Quitar de la lista"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
