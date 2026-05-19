/**
 * Auto-match best-effort de un archivo de estado de cuenta contra una cuenta
 * bancaria registrada.
 *
 * Combina pistas del NOMBRE del archivo y del CONTENIDO (cuando está
 * disponible — para PDF/`.exp` el server pre-procesa con `detect-pdf` /
 * `detect-exp`).
 *
 * Orden de prioridad (de mayor a menor confianza):
 *  1. Contenido del PDF: número de cuenta o CLABE extraídos del header.
 *  2. Contenido del PDF: RFC del titular → match con empresa_rfc de la cuenta.
 *  3. Contenido del PDF: banco + RFC vagamente.
 *  4. Contenido del .exp: empresa detectada por palabras clave → match con
 *     única cuenta de esa empresa o ese banco-empresa.
 *  5. Nombre del archivo: número de cuenta exacto.
 *  6. Nombre del archivo: CLABE exacta.
 *  7. Nombre del archivo: banco + últimos 4 dígitos.
 *  8. Nombre del archivo: único banco o única empresa coincide.
 *  9. Sin match.
 */

export type CuentaMin = {
  id: string;
  banco: string;
  numero_cuenta: string;
  clabe: string | null;
  alias: string | null;
  empresa_codigo: string | null;
  /** RFC de la empresa propietaria (opcional, mejora matching por contenido). */
  empresa_rfc?: string | null;
};

export type MatchResult = {
  cuentaId: string | null;
  confianza: "alta" | "media" | "baja" | "ninguna";
  pista: string;
};

/** Pistas extraídas del CONTENIDO del archivo (PDF o .exp). */
export type ContentHints = {
  rfc?: string | null;
  numeroCuenta?: string | null;
  clabe?: string | null;
  banco?: string | null;
  /** Empresa detectada por palabras clave en .exp. */
  empresaCodigo?: string | null;
};

/** Normaliza para comparación: lowercase + remueve no-alfanuméricos. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Extrae solo dígitos. */
function digits(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Match priorizando pistas del contenido del archivo. Si no hay contenido
 * útil, cae al matching por nombre.
 */
export function matchCuenta(
  filename: string,
  cuentas: readonly CuentaMin[],
  content?: ContentHints,
): MatchResult {
  // ──────────────────────────────────────────────────────────────────────
  // 1-3: Pistas del contenido del PDF (más confiable que el nombre).
  // ──────────────────────────────────────────────────────────────────────
  if (content) {
    // 1. Número de cuenta extraído del PDF coincide exactamente.
    if (content.numeroCuenta) {
      const ctaDigits = digits(content.numeroCuenta);
      for (const c of cuentas) {
        if (digits(c.numero_cuenta) === ctaDigits) {
          return {
            cuentaId: c.id,
            confianza: "alta",
            pista: `Cuenta ${content.numeroCuenta} extraída del PDF`,
          };
        }
      }
    }

    // 2. CLABE extraída del PDF.
    if (content.clabe) {
      const clabeDigits = digits(content.clabe);
      for (const c of cuentas) {
        if (c.clabe && digits(c.clabe) === clabeDigits) {
          return {
            cuentaId: c.id,
            confianza: "alta",
            pista: `CLABE ${content.clabe.slice(0, 4)}…${content.clabe.slice(-4)} extraída del PDF`,
          };
        }
      }
    }

    // 3. RFC extraído del PDF + única cuenta de esa empresa (o filtra por banco).
    if (content.rfc) {
      const rfcUp = content.rfc.toUpperCase();
      // Sin empresa_rfc en cuenta usamos heurística: el RFC suele asociarse
      // a una empresa por código (PSE, CIAE, IED) — el llamador pasa el mapping.
      const cuentasEmpresa = cuentas.filter(
        (c) => c.empresa_rfc?.toUpperCase() === rfcUp,
      );
      if (cuentasEmpresa.length === 1) {
        return {
          cuentaId: cuentasEmpresa[0].id,
          confianza: "alta",
          pista: `RFC ${rfcUp} del PDF coincide con única cuenta de la empresa`,
        };
      }
      if (cuentasEmpresa.length > 1 && content.banco) {
        const bancoNorm = normalize(content.banco);
        const filtroBanco = cuentasEmpresa.filter((c) =>
          normalize(c.banco).includes(bancoNorm),
        );
        if (filtroBanco.length === 1) {
          return {
            cuentaId: filtroBanco[0].id,
            confianza: "alta",
            pista: `RFC ${rfcUp} + banco ${content.banco} del PDF`,
          };
        }
      }
    }

    // 4. .exp: empresa por palabras clave + única cuenta de esa empresa.
    if (content.empresaCodigo) {
      const cuentasEmpresa = cuentas.filter(
        (c) => c.empresa_codigo === content.empresaCodigo,
      );
      if (cuentasEmpresa.length === 1) {
        return {
          cuentaId: cuentasEmpresa[0].id,
          confianza: "alta",
          pista: `Empresa ${content.empresaCodigo} detectada en conceptos del .exp`,
        };
      }
      if (cuentasEmpresa.length > 1) {
        // Si hay múltiples cuentas de la empresa, retorna baja (usuario decide).
        return {
          cuentaId: null,
          confianza: "baja",
          pista: `Empresa ${content.empresaCodigo} detectada — pero tiene ${cuentasEmpresa.length} cuentas. Elige cuál.`,
        };
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 5-9: Pistas del nombre del archivo (fallback).
  // ──────────────────────────────────────────────────────────────────────
  return matchCuentaPorNombre(filename, cuentas);
}

/**
 * Match basado solo en el nombre del archivo. Exportado para compat con
 * usos anteriores; preferir `matchCuenta` que combina nombre + contenido.
 */
export function matchCuentaPorNombre(
  filename: string,
  cuentas: readonly CuentaMin[],
): MatchResult {
  const nameNorm = normalize(filename);
  const nameDigits = digits(filename);

  // 1. Match por número de cuenta completo (al menos 10 dígitos).
  for (const c of cuentas) {
    const numDigits = digits(c.numero_cuenta ?? "");
    if (numDigits.length >= 10 && nameDigits.includes(numDigits)) {
      return {
        cuentaId: c.id,
        confianza: "alta",
        pista: `Número de cuenta ${c.numero_cuenta} encontrado en el nombre`,
      };
    }
  }

  // 2. Match por CLABE (18 dígitos completos).
  for (const c of cuentas) {
    if (!c.clabe) continue;
    const clabeDigits = digits(c.clabe);
    if (clabeDigits.length >= 11 && nameDigits.includes(clabeDigits)) {
      return {
        cuentaId: c.id,
        confianza: "alta",
        pista: `CLABE ${c.clabe} encontrada en el nombre`,
      };
    }
  }

  // 3. Match por últimos 4 dígitos + banco.
  for (const c of cuentas) {
    const numDigits = digits(c.numero_cuenta ?? "");
    if (numDigits.length < 4) continue;
    const ultimos4 = numDigits.slice(-4);
    const bancoNorm = normalize(c.banco);
    if (
      bancoNorm.length >= 3 &&
      nameNorm.includes(bancoNorm) &&
      nameDigits.includes(ultimos4)
    ) {
      return {
        cuentaId: c.id,
        confianza: "media",
        pista: `Banco "${c.banco}" y últimos 4 dígitos "${ultimos4}" coinciden`,
      };
    }
  }

  // 4. Match solo por banco (sin garantía de cuenta única).
  const matchesPorBanco = cuentas.filter((c) => {
    const bancoNorm = normalize(c.banco);
    return bancoNorm.length >= 3 && nameNorm.includes(bancoNorm);
  });
  if (matchesPorBanco.length === 1) {
    return {
      cuentaId: matchesPorBanco[0].id,
      confianza: "baja",
      pista: `Única cuenta del banco "${matchesPorBanco[0].banco}" en el sistema`,
    };
  }

  // 5. Match por empresa code (PSE, CIAE, IED, LIMSON) presente en el nombre
  //    cuando hay solo 1 cuenta de esa empresa.
  for (const codigo of ["PSE", "CIAE", "IED", "LIMSON"]) {
    if (nameNorm.includes(codigo.toLowerCase())) {
      const matchesEmpresa = cuentas.filter(
        (c) => c.empresa_codigo === codigo,
      );
      if (matchesEmpresa.length === 1) {
        return {
          cuentaId: matchesEmpresa[0].id,
          confianza: "baja",
          pista: `Único banco de ${codigo} en el sistema`,
        };
      }
    }
  }

  return {
    cuentaId: null,
    confianza: "ninguna",
    pista: "No se detectó cuenta — asigna manualmente",
  };
}
