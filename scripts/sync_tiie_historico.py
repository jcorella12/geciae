# -*- coding: utf-8 -*-
"""
Sincroniza la TIIE 28 días desde Banxico SIE hacia tiie_historico.

Carga el rango desde 2024-01-01 hasta hoy en una sola llamada y hace
upsert por (fecha, tipo). Ideal para inicializar el histórico al instalar
el sistema.
"""

import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import date, timedelta
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")


def _read_env_local() -> dict[str, str]:
    """Lee .env.local del proyecto (sin requerir dotenv)."""
    out: dict[str, str] = {}
    for candidate in (Path(".env.local"), Path(__file__).parent.parent / ".env.local"):
        if candidate.exists():
            for line in candidate.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                out[k.strip()] = v.strip().strip('"').strip("'")
            break
    return out


_env = _read_env_local()
BANXICO_TOKEN = os.environ.get("BANXICO_TOKEN") or _env.get("BANXICO_TOKEN", "")
if not BANXICO_TOKEN:
    print("Falta BANXICO_TOKEN — pon el token en .env.local o como env var.")
    sys.exit(1)
SERIE_TIIE_28 = "SF43783"
BANXICO_BASE = "https://www.banxico.org.mx/SieAPIRest/service/v1"

SUPABASE_URL = "https://dtmcqjtqykbkapzebbik.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6"
    "MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99"
    "Soa654OVbO1hwY"
)


def fetch_tiie_rango(desde: str, hasta: str):
    url = (
        f"{BANXICO_BASE}/series/{SERIE_TIIE_28}/datos/{desde}/{hasta}"
        f"?token={BANXICO_TOKEN}"
    )
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode("utf-8")
    data = json.loads(body)
    series = data.get("bmx", {}).get("series", [])
    if not series:
        return []
    datos = series[0].get("datos", [])
    out = []
    for d in datos:
        fecha_dmy = d["fecha"]  # "DD/MM/YYYY"
        dato_str = d["dato"]
        if dato_str == "N/E":
            continue
        try:
            tasa = float(dato_str) / 100.0  # Banxico devuelve %; guardamos decimal
        except ValueError:
            continue
        dd, mm, yyyy = fecha_dmy.split("/")
        out.append(
            {
                "fecha": f"{yyyy}-{mm.zfill(2)}-{dd.zfill(2)}",
                "tipo": "tiie_28",
                "tasa": round(tasa, 6),
                "fuente": "banxico_sie",
            }
        )
    return out


def upsert_lote(rows):
    if not rows:
        return 0
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    url = (
        f"{SUPABASE_URL}/rest/v1/tiie_historico"
        f"?on_conflict=fecha"
    )
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST", headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, len(rows)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def main():
    desde = "2024-01-01"
    hasta = date.today().isoformat()
    print(f"Descargando TIIE 28 de Banxico de {desde} a {hasta}...")
    datos = fetch_tiie_rango(desde, hasta)
    print(f"  Banxico devolvió {len(datos)} registros válidos.")
    if datos:
        primero, ultimo = datos[0], datos[-1]
        print(
            f"  Primer dato: {primero['fecha']} → {primero['tasa']*100:.4f}%"
        )
        print(
            f"  Último dato: {ultimo['fecha']} → {ultimo['tasa']*100:.4f}%"
        )

    # Upsert por lotes de 200
    total_ok = 0
    for i in range(0, len(datos), 200):
        lote = datos[i : i + 200]
        s, info = upsert_lote(lote)
        if s in (200, 201, 204):
            total_ok += len(lote)
            print(f"  Lote {i//200 + 1}: {len(lote)} insertados/actualizados ✓")
        else:
            print(f"  Lote {i//200 + 1}: ERROR {s} {str(info)[:200]}")
            break

    print(f"\nTotal: {total_ok} filas en tiie_historico.")


if __name__ == "__main__":
    main()
