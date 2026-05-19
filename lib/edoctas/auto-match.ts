/**
 * Auto-match best-effort de un archivo de estado de cuenta contra una cuenta
 * bancaria registrada, basado en el NOMBRE del archivo.
 *
 * Los archivos .exp de BBVA y los PDFs de estado de cuenta NO traen RFC ni
 * número de cuenta de forma estructurada en su contenido — los .exp son TSV
 * de puros movimientos. Por eso el match se basa en pistas del nombre del
 * archivo (que el banco o el contador suelen ponerle el número de cuenta o
 * el banco).
 *
 * Heurísticas (orden de prioridad):
 *  1. Match por NÚMERO DE CUENTA: si el nombre contiene los últimos 10+ dígitos
 *     del número de cuenta exacto.
 *  2. Match por CLABE: si el nombre contiene los últimos 11+ dígitos de CLABE.
 *  3. Match por ÚLTIMOS 4 dígitos + banco: si el nombre contiene "BBVA" y
 *     los últimos 4 dígitos de la cuenta.
 *  4. Sin match: el usuario debe asignar manualmente.
 */

export type CuentaMin = {
  id: string;
  banco: string;
  numero_cuenta: string;
  clabe: string | null;
  alias: string | null;
  empresa_codigo: string | null;
};

export type MatchResult = {
  cuentaId: string | null;
  confianza: "alta" | "media" | "baja" | "ninguna";
  pista: string;
};

/** Normaliza para comparación: lowercase + remueve no-alfanuméricos. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Extrae solo dígitos. */
function digits(s: string): string {
  return s.replace(/\D/g, "");
}

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
