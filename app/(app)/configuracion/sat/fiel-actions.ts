"use server";

/**
 * Sprint 8.1 — Server actions para gestión de FIELs.
 * Solo CEO + atributo contralor pueden ejecutar estas acciones.
 */

import { revalidatePath } from "next/cache";

import { encriptarPassword } from "@/lib/sat/crypto";
import type { FielEnriquecida } from "@/lib/sat/state";
import { createClient } from "@/lib/supabase/server";

async function exigirPermiso(): Promise<{ userId: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puede } = await (supabase as any).rpc(
    "usuario_puede_gestionar_sat",
  );
  if (!puede) {
    throw new Error("Sin permisos. Solo CEO o contralor.");
  }
  return { userId: user.id };
}

export type ResultadoSubirFiel =
  | {
      ok: true;
      rfc: string;
      razonSocial: string | null;
      vigenciaHasta: string;
    }
  | { ok: false; error: string };

/**
 * Sube nueva FIEL. Valida con la librería antes de guardar.
 */
export async function subirFiel(formData: FormData): Promise<ResultadoSubirFiel> {
  try {
    const { userId } = await exigirPermiso();
    const supabase = createClient();

    const empresaId = String(formData.get("empresa_id") ?? "");
    const cerFile = formData.get("cer");
    const keyFile = formData.get("key");
    const password = String(formData.get("password") ?? "");

    if (!empresaId) return { ok: false, error: "Empresa requerida" };
    if (!(cerFile instanceof File) || !(keyFile instanceof File)) {
      return { ok: false, error: "Archivos .cer y .key requeridos" };
    }
    if (password.length < 4) {
      return { ok: false, error: "Contraseña inválida (mín 4 chars)" };
    }

    const cerBuffer = Buffer.from(await cerFile.arrayBuffer());
    const keyBuffer = Buffer.from(await keyFile.arrayBuffer());

    // Validar FIEL con @nodecfdi/credentials.
    // En sat-ws-descarga-masiva v2 el objeto Fiel solo expone isValid()/sign();
    // los metadatos (rfc, legalName, vigencia, isFiel) están en Credential.
    // IMPORTANTE: el entry default solo exporta clases base; Credential vive
    // en el subpath /node (que es lo que necesitamos en server actions).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const credentialsLib: any = await import("@nodecfdi/credentials/node");
    const CredentialClass =
      credentialsLib.Credential ?? credentialsLib.default?.Credential;
    if (!CredentialClass || typeof CredentialClass.create !== "function") {
      return {
        ok: false,
        error: "Librería @nodecfdi/credentials no disponible.",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let credential: any;
    try {
      credential = CredentialClass.create(
        cerBuffer.toString("binary"),
        keyBuffer.toString("binary"),
        password,
      );
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "";
      return {
        ok: false,
        error:
          "FIEL inválida. Verifica que .cer y .key correspondan y que la contraseña sea correcta. " +
          (msg ? `(${msg})` : ""),
      };
    }

    if (typeof credential.isFiel === "function" && !credential.isFiel()) {
      return {
        ok: false,
        error:
          "El certificado no es FIEL/eFirma. Es CSD (Sello Digital). La descarga masiva requiere FIEL.",
      };
    }

    const certificate = credential.certificate();
    let numeroSerie = "";
    try {
      const serial = certificate.serialNumber?.();
      if (serial) {
        numeroSerie =
          typeof serial.bytes === "function"
            ? serial.bytes()
            : typeof serial.hex === "function"
              ? serial.hex()
              : String(serial);
      }
    } catch {
      numeroSerie = "";
    }
    const vigenciaDesde: Date =
      typeof certificate.validFrom === "function"
        ? certificate.validFrom()
        : new Date();
    const vigenciaHasta: Date =
      typeof certificate.validTo === "function"
        ? certificate.validTo()
        : new Date();
    const rfcCertificado: string = credential.rfc();
    const razonSocial: string | null =
      typeof credential.legalName === "function" ? credential.legalName() : null;

    // Validar RFC vs empresa
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: empresa } = (await (supabase as any)
      .from("empresas")
      .select("codigo, rfc")
      .eq("id", empresaId)
      .maybeSingle()) as unknown as {
      data: { codigo: string; rfc: string } | null;
    };

    if (!empresa) return { ok: false, error: "Empresa no encontrada" };

    if (empresa.rfc.toUpperCase() !== rfcCertificado.toUpperCase()) {
      return {
        ok: false,
        error: `RFC del certificado (${rfcCertificado}) no coincide con RFC de empresa (${empresa.rfc})`,
      };
    }

    // Subir archivos a Storage
    const timestamp = Date.now();
    const cerPath = `${empresa.codigo}/${timestamp}/cert.cer`;
    const keyPath = `${empresa.codigo}/${timestamp}/key.key`;

    const { error: cerErr } = await supabase.storage
      .from("sat-fiel")
      .upload(cerPath, cerBuffer, { contentType: "application/x-x509-ca-cert" });
    if (cerErr) return { ok: false, error: `Error subiendo .cer: ${cerErr.message}` };

    const { error: keyErr } = await supabase.storage
      .from("sat-fiel")
      .upload(keyPath, keyBuffer, { contentType: "application/octet-stream" });
    if (keyErr) {
      await supabase.storage.from("sat-fiel").remove([cerPath]);
      return { ok: false, error: `Error subiendo .key: ${keyErr.message}` };
    }

    const passwordEncrypted = encriptarPassword(password);

    // Archivar FIEL anterior (si existe activa)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("sat_credenciales")
      .update({ estado: "archivada" })
      .eq("empresa_id", empresaId)
      .eq("estado", "activa");

    // Insertar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await (supabase as any)
      .from("sat_credenciales")
      .insert({
        empresa_id: empresaId,
        rfc: rfcCertificado,
        cer_storage_path: cerPath,
        key_storage_path: keyPath,
        password_encrypted: passwordEncrypted,
        numero_serie: numeroSerie,
        vigencia_desde: vigenciaDesde.toISOString().slice(0, 10),
        vigencia_hasta: vigenciaHasta.toISOString().slice(0, 10),
        rfc_certificado: rfcCertificado,
        razon_social_certificado: razonSocial,
        estado: "activa",
        registrada_por: userId,
      });

    if (insErr) {
      await supabase.storage.from("sat-fiel").remove([cerPath, keyPath]);
      return { ok: false, error: `Error guardando FIEL: ${insErr.message}` };
    }

    revalidatePath("/configuracion/sat");
    return {
      ok: true,
      rfc: rfcCertificado,
      razonSocial,
      vigenciaHasta: vigenciaHasta.toISOString().slice(0, 10),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    };
  }
}

export async function validarFiel(
  empresaId: string,
): Promise<{ valida: boolean; mensaje: string }> {
  try {
    const { cargarFiel } = await import("@/lib/sat/fiel-loader");
    await cargarFiel(empresaId);
    return { valida: true, mensaje: "FIEL válida y vigente" };
  } catch (e) {
    return {
      valida: false,
      mensaje: e instanceof Error ? e.message : "Error desconocido",
    };
  }
}

export async function archivarFiel(
  credencialId: string,
  motivo: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await exigirPermiso();
    if (!motivo || motivo.length < 10) {
      return {
        ok: false,
        error: "Motivo de archivado obligatorio (mín 10 caracteres)",
      };
    }
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("sat_credenciales")
      .update({
        estado: "archivada",
        observaciones: `ARCHIVADA: ${motivo}`,
      })
      .eq("id", credencialId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/configuracion/sat");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listarFiels(): Promise<FielEnriquecida[]> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("v_sat_credenciales_enriquecido")
    .select("*")
    .order("vigencia_hasta", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FielEnriquecida[];
}
