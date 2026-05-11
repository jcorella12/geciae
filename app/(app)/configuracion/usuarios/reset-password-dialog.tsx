"use client";

import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { restablecerContrasenaUsuario } from "./actions";

/**
 * Genera una contraseña temporal "legible": 12 caracteres alfanuméricos sin
 * caracteres ambiguos (0/O/1/l/I), mezclando mayúsculas, minúsculas y dígitos.
 */
function generarContrasenaTemporal(): string {
  const mayus = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const minus = "abcdefghijkmnpqrstuvwxyz";
  const digitos = "23456789";
  const todos = mayus + minus + digitos;
  const out: string[] = [];
  // Garantiza al menos una de cada grupo.
  out.push(mayus[Math.floor(Math.random() * mayus.length)]);
  out.push(minus[Math.floor(Math.random() * minus.length)]);
  out.push(digitos[Math.floor(Math.random() * digitos.length)]);
  for (let i = 0; i < 9; i++) {
    out.push(todos[Math.floor(Math.random() * todos.length)]);
  }
  // Shuffle Fisher-Yates.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

type Props = {
  usuarioId: string;
  email: string;
};

export function ResetPasswordDialog({ usuarioId, email }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<{ email: string; password: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setPassword("");
    setConfirm("");
    setError(null);
    setOk(null);
    setCopied(false);
  }

  function close() {
    setOpen(false);
    // Pequeña espera para no mostrar el reset durante el cierre.
    setTimeout(reset, 200);
  }

  function generar() {
    const nueva = generarContrasenaTemporal();
    setPassword(nueva);
    setConfirm(nueva);
    setError(null);
  }

  function copiar() {
    if (!ok) return;
    navigator.clipboard.writeText(ok.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    startTransition(async () => {
      const r = await restablecerContrasenaUsuario(usuarioId, password);
      if (!r.ok) {
        setError(r.error ?? "Error desconocido");
        return;
      }
      setOk({ email: r.email ?? email, password });
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Restablecer contraseña de este usuario"
      >
        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
        Contraseña
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-md rounded-md border border-border bg-card shadow-lg">
            <div className="border-b border-border px-5 py-3">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <KeyRound className="h-4 w-4" />
                Restablecer contraseña
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-3">
                Vas a cambiar la contraseña de{" "}
                <span className="font-medium">{email}</span>.
              </p>
            </div>

            <div className="p-5">
              {ok ? (
                <div className="space-y-4">
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3">
                    <p className="text-[13px] font-medium text-emerald-900">
                      ✓ Contraseña actualizada
                    </p>
                    <p className="mt-1 text-[12px] text-emerald-800">
                      Comunícale al usuario que entre con esta contraseña y la
                      cambie de inmediato desde su menú.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Usuario
                    </Label>
                    <p className="mt-1 text-sm font-medium">{ok.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Contraseña temporal
                    </Label>
                    <div className="mt-1 flex gap-2">
                      <code className="flex-1 rounded-md border border-border bg-bg-2 px-3 py-2 font-mono text-sm">
                        {ok.password}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={copiar}
                      >
                        {copied ? (
                          <>
                            <Check className="mr-1 h-3.5 w-3.5 text-emerald-700" />
                            Copiada
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button onClick={close} className="w-full">
                    Cerrar
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="nueva">Nueva contraseña</Label>
                      <button
                        type="button"
                        onClick={generar}
                        className="flex items-center gap-1 text-[11.5px] text-brand hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Generar temporal
                      </button>
                    </div>
                    <Input
                      id="nueva"
                      type="text"
                      autoComplete="off"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Pídele al usuario que entre con esta contraseña y la
                      cambie de inmediato desde su menú.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmar contraseña</Label>
                    <Input
                      id="confirm"
                      type="text"
                      autoComplete="off"
                      required
                      minLength={8}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="font-mono"
                    />
                  </div>

                  {error && (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={close}
                      disabled={pending}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        pending ||
                        password.length < 8 ||
                        password !== confirm
                      }
                      className="flex-1"
                    >
                      {pending ? "Cambiando…" : "Cambiar contraseña"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
