/**
 * Sprint 8 — Carga la FIEL completa de una empresa desde Supabase Storage,
 * desencriptando la contraseña y validando vigencia.
 */

import { createClient } from "@/lib/supabase/server";

import { desencriptarPassword } from "./crypto";

export type FielCargada = {
  cer: Buffer;
  key: Buffer;
  password: string;
  rfc: string;
  vigenciaHasta: Date;
  credencialId: string;
};

export async function cargarFiel(empresaId: string): Promise<FielCargada> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cred, error } = (await (supabase as any)
    .from("sat_credenciales")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("estado", "activa")
    .maybeSingle()) as unknown as {
    data:
      | {
          id: string;
          cer_storage_path: string;
          key_storage_path: string;
          password_encrypted: string;
          rfc: string;
          vigencia_hasta: string;
          veces_usada: number;
        }
      | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  if (!cred) {
    throw new Error(`No hay FIEL activa para esta empresa.`);
  }

  // Validar vigencia
  const hoy = new Date();
  const vigenciaHasta = new Date(cred.vigencia_hasta);
  if (vigenciaHasta < hoy) {
    throw new Error(
      `FIEL vencida desde ${vigenciaHasta.toLocaleDateString("es-MX")}. ` +
        `Renueva la FIEL en el SAT y actualízala en el sistema.`,
    );
  }

  // Descargar archivos
  const { data: cerFile, error: cerError } = await supabase.storage
    .from("sat-fiel")
    .download(cred.cer_storage_path);
  if (cerError || !cerFile) {
    throw new Error(`Error cargando .cer: ${cerError?.message ?? ""}`);
  }

  const { data: keyFile, error: keyError } = await supabase.storage
    .from("sat-fiel")
    .download(cred.key_storage_path);
  if (keyError || !keyFile) {
    throw new Error(`Error cargando .key: ${keyError?.message ?? ""}`);
  }

  const cer = Buffer.from(await cerFile.arrayBuffer());
  const key = Buffer.from(await keyFile.arrayBuffer());
  const password = desencriptarPassword(cred.password_encrypted);

  // Incrementar contador de uso
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("sat_credenciales")
    .update({
      veces_usada: (cred.veces_usada ?? 0) + 1,
      ultima_validacion_at: new Date().toISOString(),
    })
    .eq("id", cred.id);

  return {
    cer,
    key,
    password,
    rfc: cred.rfc,
    vigenciaHasta,
    credencialId: cred.id,
  };
}
