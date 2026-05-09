/**
 * Sprint 8 — Encriptación AES-256-GCM para passwords de FIEL.
 *
 * Las contraseñas de las llaves privadas (.key) NO se guardan en claro en BD.
 * Se encriptan con SAT_FIEL_ENCRYPTION_KEY (env var, 32 bytes hex). Si esa
 * clave se pierde, las FIELs guardadas no pueden descifrarse y hay que
 * volver a cargarlas.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.SAT_FIEL_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "SAT_FIEL_ENCRYPTION_KEY no configurada. " +
        "Genera una con: openssl rand -hex 32",
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      "SAT_FIEL_ENCRYPTION_KEY debe ser 32 bytes en hex (64 chars).",
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encripta un password en formato `base64(iv):base64(authTag):base64(ciphertext)`.
 */
export function encriptarPassword(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Desencripta un valor producido por `encriptarPassword`. Lanza error si la
 * clave no coincide o si el formato es inválido.
 */
export function desencriptarPassword(encrypted: string): string {
  const key = getEncryptionKey();
  const partes = encrypted.split(":");
  if (partes.length !== 3) {
    throw new Error("Formato de password encriptado inválido.");
  }
  const [ivB64, authTagB64, cipherB64] = partes;

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}
