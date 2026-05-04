"use client";

import { ShieldCheck, Sparkles, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { validar69BProveedor } from "./ia-actions";

export function Validador69B({ proveedorId }: { proveedorId: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [resultado, setResultado] = useState<
    | {
        veredicto: "no_aparece" | "aparece" | "indeterminado";
        rfc_detectado: string | null;
        rfc_proveedor: string;
        coincide_rfc: boolean;
        evidencia: string | null;
        documento_creado: boolean;
        nuevo_semaforo: string | null;
        confianza: number;
      }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResultado(null);
    const fd = new FormData();
    fd.append("archivo", file);
    startTransition(async () => {
      const res = await validar69BProveedor(proveedorId, fd);
      if (inputRef.current) inputRef.current.value = "";
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResultado({
        ...res.defaults,
        confianza: res.meta.confidence,
      });
    });
  }

  return (
    <section className="rounded-lg border border-dashed border-accent/50 bg-accent/5 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Validar lista 69-B con IA</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sube una captura o PDF de la consulta del SAT (
            <a
              href="http://omawww.sat.gob.mx/cifras_sat/Paginas/datos/vinculo.html?page=ListCompleta69B.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              consulta lista 69-B aquí
            </a>
            ). La IA verifica si el RFC del proveedor aparece y, si todo está
            limpio, registra automáticamente el documento de cumplimiento con
            vencimiento de 30 días.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          className="hidden"
          disabled={isPending}
        />
        {!open ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.click(), 50);
            }}
            disabled={isPending}
          >
            <Upload className="h-4 w-4" />
            Validar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
          >
            {isPending ? "Validando…" : "Subir otra"}
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {resultado && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3 text-sm">
          {!resultado.coincide_rfc ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              ⚠ El RFC detectado en la consulta (
              <code className="font-mono">
                {resultado.rfc_detectado ?? "no detectado"}
              </code>
              ) NO coincide con el del proveedor (
              <code className="font-mono">{resultado.rfc_proveedor}</code>).
              Verifica que la captura sea de la consulta correcta.
            </p>
          ) : resultado.veredicto === "no_aparece" ? (
            <p className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>
                <strong>Cumple:</strong> el RFC NO aparece en la lista 69-B.
                {resultado.documento_creado &&
                  " Documento de validación registrado automáticamente con vencimiento en 30 días."}
              </span>
            </p>
          ) : resultado.veredicto === "aparece" ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <strong>⚠ ALERTA:</strong> el RFC SÍ aparece en la lista 69-B.
              {resultado.nuevo_semaforo === "negro" &&
                " El proveedor fue marcado automáticamente en semáforo NEGRO."}
            </p>
          ) : (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              No fue posible determinar el resultado con certeza. Revisa el
              documento e intenta con una captura más clara.
            </p>
          )}

          {resultado.evidencia && (
            <p className="text-xs text-muted-foreground">
              <strong>Evidencia citada:</strong> {resultado.evidencia}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Confianza IA: {(resultado.confianza * 100).toFixed(0)}%
          </p>
        </div>
      )}
    </section>
  );
}
