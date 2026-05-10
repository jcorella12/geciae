"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic-link" | "reset" | "mfa-challenge";

type MfaPending = {
  factorId: string;
};

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfa, setMfa] = useState<MfaPending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "";
  const resetCallbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/perfil/contrasena")}`
      : "";

  async function handleAfterPasswordSignIn(): Promise<void> {
    const { data: aal, error: aalErr } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) {
      setError(aalErr.message);
      return;
    }
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel === "aal1") {
      // MFA requerido — buscar factor verificado y mostrar challenge.
      const { data: factors, error: fErr } =
        await supabase.auth.mfa.listFactors();
      if (fErr) {
        setError(fErr.message);
        return;
      }
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        setError(
          "Tu cuenta requiere MFA pero no encontramos un factor verificado.",
        );
        return;
      }
      setMfa({ factorId: totp.id });
      setMode("mfa-challenge");
      setPassword(""); // limpiar password en memoria
      return;
    }

    // No requiere MFA → entrar.
    router.refresh();
    router.push("/mi-dia");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        await handleAfterPasswordSignIn();
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: resetCallbackUrl,
        });
        if (error) {
          setError(error.message);
          return;
        }
        setInfo(
          "Si la cuenta existe, te enviamos un correo con un enlace para restablecer tu contraseña. Revisa tu bandeja (incluida la carpeta de spam).",
        );
        return;
      }

      if (mode === "magic-link") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) {
          setError(error.message);
          return;
        }
        setInfo(
          "Te enviamos un enlace de inicio de sesión. Revisa tu correo (incluida la carpeta de spam).",
        );
        return;
      }

      if (mode === "mfa-challenge" && mfa) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
          factorId: mfa.factorId,
        });
        if (chErr || !ch) {
          setError(chErr?.message ?? "Error creando challenge");
          return;
        }
        const { error: vErr } = await supabase.auth.mfa.verify({
          factorId: mfa.factorId,
          challengeId: ch.id,
          code: code.trim(),
        });
        if (vErr) {
          setError(vErr.message);
          return;
        }
        router.refresh();
        router.push("/mi-dia");
      }
    });
  }

  const titles: Record<Mode, { title: string; description: string }> = {
    password: {
      title: "Iniciar sesión",
      description: "Acceso al ERP del Grupo PSENERGIA.",
    },
    reset: {
      title: "Restablecer contraseña",
      description:
        "Te enviaremos un enlace al correo para que elijas una nueva contraseña.",
    },
    "magic-link": {
      title: "Enlace mágico",
      description: "Te enviamos un enlace al correo para entrar sin contraseña.",
    },
    "mfa-challenge": {
      title: "Verificación de dos factores",
      description:
        "Ingresa el código de 6 dígitos generado por tu app de autenticación.",
    },
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/ciae.png"
            alt="GECIAE — Grupo Empresarial CIAE"
            width={48}
            height={48}
            priority
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ERP GECIAE
            </p>
            <p className="text-xs text-muted-foreground">
              PSENERGIA · CIAE · IED · Limson
            </p>
          </div>
        </div>
        <CardTitle>{titles[mode].title}</CardTitle>
        <CardDescription>{titles[mode].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "mfa-challenge" ? (
            <div className="space-y-2">
              <Label htmlFor="totp">Código de 6 dígitos</Label>
              <Input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="font-mono tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Sesión iniciada como{" "}
                <span className="font-medium">{email}</span>.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@psenergia.com.mx"
                />
              </div>

              {mode === "password" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
              {info}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              isPending ||
              (mode === "mfa-challenge" && code.length !== 6)
            }
          >
            {isPending
              ? "..."
              : mode === "password"
                ? "Iniciar sesión"
                : mode === "reset"
                  ? "Enviar enlace de restablecimiento"
                  : mode === "magic-link"
                    ? "Enviar enlace"
                    : "Verificar"}
          </Button>
        </form>

        {mode !== "mfa-challenge" ? (
          <div className="mt-6 space-y-2 text-center text-sm">
            {mode === "password" && (
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError(null);
                  setInfo(null);
                }}
                className="block w-full text-muted-foreground hover:text-foreground"
              >
                ¿Olvidaste tu contraseña? Restablecer
              </button>
            )}
            {mode !== "magic-link" && mode !== "reset" && (
              <button
                type="button"
                onClick={() => {
                  setMode("magic-link");
                  setError(null);
                  setInfo(null);
                }}
                className="block w-full text-muted-foreground hover:text-foreground"
              >
                Recibir enlace mágico al correo
              </button>
            )}
            {mode !== "password" && (
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setError(null);
                  setInfo(null);
                }}
                className="block w-full text-muted-foreground hover:text-foreground"
              >
                Volver a inicio con contraseña
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={async () => {
                // Cancelar challenge: cerrar sesión a medias.
                await supabase.auth.signOut();
                setMfa(null);
                setMode("password");
                setCode("");
                setError(null);
                setInfo(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar e intentar de nuevo
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
