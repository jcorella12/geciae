/**
 * Helper para consultar y sincronizar la TIIE 28 desde Banxico SIE.
 *
 * Banxico SIE expone una API pública: https://www.banxico.org.mx/SieAPIRest/
 * Serie de TIIE 28 días: SF43783
 *
 * Requiere `BANXICO_TOKEN` en `.env.local`. Se obtiene gratis en
 * https://www.banxico.org.mx/SieAPIRest/service/v1/token
 *
 * Si no hay token, las funciones devuelven { ok: false } y se puede capturar
 * la TIIE manualmente.
 */

const SERIE_TIIE_28 = "SF43783";
const BASE = "https://www.banxico.org.mx/SieAPIRest/service/v1";

export type TiieDato = {
  fecha: string; // ISO YYYY-MM-DD
  tasa: number; // ej. 0.1075 (10.75% como decimal)
};

type BanxicoSerie = {
  bmx?: {
    series?: Array<{
      idSerie?: string;
      titulo?: string;
      datos?: Array<{ fecha: string; dato: string }>;
    }>;
  };
};

function parseFechaBanxico(fechaDdMmYyyy: string): string {
  // Banxico devuelve "DD/MM/YYYY"
  const [d, m, y] = fechaDdMmYyyy.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseTasa(dato: string): number | null {
  if (!dato || dato === "N/E") return null;
  const n = Number(dato);
  if (Number.isNaN(n)) return null;
  // Banxico devuelve la tasa en porcentaje (ej. "10.7500"). Guardamos decimal.
  return n / 100;
}

export async function fetchTiieReciente(): Promise<
  { ok: true; dato: TiieDato } | { ok: false; error: string }
> {
  const token = process.env.BANXICO_TOKEN;
  if (!token) return { ok: false, error: "BANXICO_TOKEN no configurado." };

  try {
    const res = await fetch(
      `${BASE}/series/${SERIE_TIIE_28}/datos/oportuno?token=${token}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return { ok: false, error: `Banxico HTTP ${res.status}` };
    }
    const json = (await res.json()) as BanxicoSerie;
    const datos = json.bmx?.series?.[0]?.datos ?? [];
    if (datos.length === 0) {
      return { ok: false, error: "Sin datos en respuesta Banxico." };
    }
    const ultimo = datos[datos.length - 1];
    const tasa = parseTasa(ultimo.dato);
    if (tasa === null) return { ok: false, error: "Tasa no numérica." };
    return {
      ok: true,
      dato: { fecha: parseFechaBanxico(ultimo.fecha), tasa },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function fetchTiieRango(
  desde: string,
  hasta: string,
): Promise<{ ok: true; datos: TiieDato[] } | { ok: false; error: string }> {
  const token = process.env.BANXICO_TOKEN;
  if (!token) return { ok: false, error: "BANXICO_TOKEN no configurado." };

  try {
    const res = await fetch(
      `${BASE}/series/${SERIE_TIIE_28}/datos/${desde}/${hasta}?token=${token}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return { ok: false, error: `Banxico HTTP ${res.status}` };
    }
    const json = (await res.json()) as BanxicoSerie;
    const datos = json.bmx?.series?.[0]?.datos ?? [];
    const limpios: TiieDato[] = [];
    for (const d of datos) {
      const tasa = parseTasa(d.dato);
      if (tasa !== null) {
        limpios.push({ fecha: parseFechaBanxico(d.fecha), tasa });
      }
    }
    return { ok: true, datos: limpios };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
