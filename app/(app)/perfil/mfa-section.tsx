"use client";

import { ShieldCheck, ShieldOff } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type EnrollState = {
  factorId: string;
  qrSvg: string; // data:image/svg+xml...
  secret: string;
};

type Props = {
  existingFactor: {
    id: string;
    friendlyName: string | null;
    status: string;
  } | null;
};

export function MfaSection({ existingFactor }: Props) {
  const supabase = createClient();
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEnroll() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `TOTP ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setEnroll({
        factorId: data.id,
        qrSvg: data.totp.qr_code,
        secret: data.totp.secret,
      });
    });
  }

  function cancelEnroll() {
    if (!enroll) return;
    startTransition(async () => {
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
      setEnroll(null);
      setCode("");
    });
  }

  function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setError(null);
    startTransition(async () => {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: enroll.factorId,
      });
      if (chErr || !ch) {
        setError(chErr?.message ?? "Error creando challenge");
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (vErr) {
        setError(vErr.message);
        return;
      }
      setEnroll(null);
      setCode("");
      setInfo("MFA activado correctamente.");
      // Forzar reload para refrescar el server component.
      window.location.reload();
    });
  }

  async function unenrollExisting() {
    if (!existingFactor) return;
    if (
      !(await confirm({
        message:
          "¿Desactivar MFA? Tu cuenta quedará protegida solo por contraseña.",
        danger: true,
        confirmLabel: "Desactivar",
      }))
    )
      return;
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: existingFactor.id,
      });
      if (error) {
        setError(error.message);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {existingFactor?.status === "verified" ? (
          <ShieldCheck className="h-5 w-5 text-success" />
        ) : (
          <ShieldOff className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="flex-1">
          <h2 className="text-base font-semibold">
            Autenticación de dos factores (MFA)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suma una capa extra a tu cuenta. El sistema te pedirá un código de
            6 dígitos generado por una app como Google Authenticator, 1Password
            o Authy.
          </p>
          <p className="mt-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs">
            Cuando esté activo, el sistema te pedirá el código en cada login.
            Para roles sensibles (CEO, aprobador financiero {">"} 500k MXN,
            tesorero corporativo) será obligatorio en Sprint 9.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {info && (
        <p className="mt-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          {info}
        </p>
      )}

      <div className="mt-5">
        {existingFactor && existingFactor.status === "verified" ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
            <div>
              <p className="text-sm font-medium">
                MFA activo —{" "}
                {existingFactor.friendlyName ?? "Factor TOTP"}
              </p>
              <p className="text-xs text-muted-foreground">
                Eliminar este factor te dejará solo con contraseña.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={unenrollExisting}
              disabled={isPending}
            >
              Desactivar
            </Button>
          </div>
        ) : enroll ? (
          <form onSubmit={verifyCode} className="space-y-4">
            <div>
              <p className="text-sm font-medium">
                Escanea el código QR con tu app de autenticación
              </p>
              <div className="mt-2 inline-block rounded-md border border-border bg-white p-3">
                {/* qr_code es un data URL SVG */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enroll.qrSvg}
                  alt="Código QR para configurar TOTP"
                  className="h-44 w-44"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                ¿No puedes escanear? Captura el código manual:{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                  {enroll.secret}
                </code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totp-code">Código de 6 dígitos</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-32 font-mono tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending || code.length !== 6}>
                {isPending ? "Verificando…" : "Activar MFA"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEnroll}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={startEnroll} disabled={isPending}>
            {isPending ? "Iniciando…" : "Activar MFA"}
          </Button>
        )}
      </div>
    </section>
  );
}
