# -*- coding: utf-8 -*-
"""
PODA-SAT · S2 — Borrado seguro de e.firmas (FIEL) del Storage.

⚠️ PASO MANUAL OBLIGATORIO antes de aplicar la migración que dropea
   sat_credenciales. Borra material fiscal SENSIBLE (cert.cer + key.key de
   las 4 empresas) del bucket `sat-fiel`. Es IRREVERSIBLE — re-tramitar una
   e.firma con el SAT es un trámite presencial.

Decisión CEO (2026-06-10): la descarga masiva SAT se retira (nunca devolvió
facturas). El ERP no volverá a almacenar e.firmas; el proveedor comercial
futuro las registra en SU plataforma.

Uso:
    python scripts/limpiar_fiel_storage.py            # dry-run (solo lista)
    python scripts/limpiar_fiel_storage.py --aplicar  # borra de verdad

Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local.
"""
import json
import os
import sys
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding="utf-8")

BUCKET = "sat-fiel"


def cargar_env():
    url = key = None
    with open(".env.local", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("NEXT_PUBLIC_SUPABASE_URL="):
                url = line.split("=", 1)[1].strip().strip('"')
            elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                key = line.split("=", 1)[1].strip().strip('"')
    if not url or not key:
        sys.exit("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")
    return url, key


def req(method, url, key, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


def main():
    aplicar = "--aplicar" in sys.argv
    url, key = cargar_env()

    # 1. Leer credenciales (REST PostgREST)
    status, creds = req(
        "GET",
        f"{url}/rest/v1/sat_credenciales?select=id,rfc_certificado,cer_storage_path,key_storage_path",
        key,
    )
    if status != 200 or not isinstance(creds, list):
        sys.exit(f"No se pudo leer sat_credenciales: {status} {creds}")

    paths = []
    for c in creds:
        for col in ("cer_storage_path", "key_storage_path"):
            if c.get(col):
                paths.append(c[col])
    print(f"Credenciales: {len(creds)} · archivos a borrar: {len(paths)}")
    for p in paths:
        print(f"  - {BUCKET}/{p}")

    if not aplicar:
        print("\n[DRY-RUN] No se borró nada. Corre con --aplicar para borrar.")
        return

    # 2. Borrar los objetos del bucket en bulk (Storage API).
    #    El DELETE de objeto único con Content-Type json falla ("Body cannot
    #    be empty"); el endpoint bulk acepta {prefixes:[...]} y borra todos.
    st, resp = req("DELETE", f"{url}/storage/v1/object/{BUCKET}", key, {"prefixes": paths})
    if st in (200, 204) and isinstance(resp, list):
        borrados = len(resp)
        for o in resp:
            print(f"  ✓ borrado {o.get('name')}")
    else:
        print(f"  ✗ error en borrado bulk: {st} {resp}")
        borrados = 0

    print(f"\nBorrados {borrados}/{len(paths)} archivos.")
    print("Siguiente: vaciar la tabla y aplicar la migración drop_sat_descarga_masiva.")


if __name__ == "__main__":
    main()
