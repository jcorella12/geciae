# -*- coding: utf-8 -*-
"""
Borra los proyectos SEED (códigos PRY-2024-*) y todos sus datos relacionados.

Los 5 proyectos seed son los que se cargaron al instalar el sistema con
nombres genéricos (Torre Polanco, Bodega Industrial Querétaro, etc.) y código
PRY-2024-*. Los reales del cliente son CIAE-2026-* y PSE-2026-*.

Para OCs vinculadas no las borra — las desvincula (proyecto_id=NULL) por
seguridad: pueden tener CFDIs/movimientos contables que no debemos tocar.

Uso:
    python scripts/borrar_proyectos_seed.py             # ejecuta
    python scripts/borrar_proyectos_seed.py --dry-run   # solo cuenta
"""

import json
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

DRY_RUN = "--dry-run" in sys.argv

SUPABASE_URL = "https://dtmcqjtqykbkapzebbik.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6"
    "MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99"
    "Soa654OVbO1hwY"
)

H = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}


def http(method: str, path: str, body=None, prefer=None) -> tuple[int, str]:
    h = dict(H)
    if prefer:
        h["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}", data=data, method=method, headers=h
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def count(path_with_filter: str) -> int:
    s, body = http("GET", f"{path_with_filter}&limit=1", prefer="count=exact")
    if s != 200:
        return 0
    # Volver a llamar con head para Content-Range
    h = dict(H)
    h["Prefer"] = "count=exact"
    h["Range"] = "0-0"
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path_with_filter}", method="HEAD", headers=h
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            cr = r.headers.get("Content-Range") or "*/0"
            return int(cr.split("/")[-1])
    except Exception:
        return 0


def main() -> None:
    print("=" * 70)
    print("BORRAR PROYECTOS SEED (PRY-2024-*)")
    print(f"DRY-RUN: {DRY_RUN}")
    print("=" * 70)

    s, body = http("GET", "proyectos?select=id,codigo,nombre&codigo=like.PRY-2024-*")
    proyectos = json.loads(body)
    if not proyectos:
        print("No hay proyectos PRY-2024-* — nada que hacer.")
        return

    print(f"\nProyectos a eliminar: {len(proyectos)}")
    for p in proyectos:
        print(f"  {p['codigo']:<15} {p['nombre']}")

    ids = [p["id"] for p in proyectos]
    ids_in = ",".join([f'"{i}"' for i in ids])

    # Tablas a limpiar (orden FK: hijos primero)
    pasos = [
        ("proyecto_costos_imputados", "proyecto_id"),
        ("proyecto_horas_trabajadas", "proyecto_id"),
        ("proyecto_tareas", "proyecto_id"),
        ("proyecto_bitacora", "proyecto_id"),
        ("proyecto_reportes", "proyecto_id"),
        ("proyecto_presupuesto", "proyecto_id"),
        ("centros_movimientos", "proyecto_id"),
        ("inventario_movimientos", "proyecto_id"),
    ]

    print("\n=== 1. Borrar dependencias ===")
    for tabla, col in pasos:
        s, body = http(
            "GET", f"{tabla}?select=id&{col}=in.({ids_in})", prefer="count=exact"
        )
        try:
            rows = json.loads(body)
        except Exception:
            rows = []
        n = len(rows)
        if n == 0:
            continue
        print(f"  {tabla:<35} {n} filas", end="")
        if not DRY_RUN:
            ds, db = http(
                "DELETE",
                f"{tabla}?{col}=in.({ids_in})",
                prefer="return=minimal",
            )
            print(f"  → DELETE status {ds}")
        else:
            print("  (dry-run)")

    # Desvincular vehículos asignados a estos proyectos (no borrarlos)
    print("\n=== 2. Desvincular vehículos asignados ===")
    s, body = http(
        "GET",
        f"vehiculos?select=id,placa,proyecto_asignado_id&proyecto_asignado_id=in.({ids_in})",
    )
    try:
        vehs = json.loads(body)
    except Exception:
        vehs = []
    if vehs:
        print(f"  {len(vehs)} vehículos asignados a estos proyectos")
        if not DRY_RUN:
            ds, db = http(
                "PATCH",
                f"vehiculos?proyecto_asignado_id=in.({ids_in})",
                body={"proyecto_asignado_id": None},
                prefer="return=minimal",
            )
            print(f"  → desvinculados status {ds}")
    else:
        print("  Ninguno")

    # Desvincular OCs (no borrarlas — pueden tener CFDIs/movs contables)
    print("\n=== 3. Desvincular OCs ===")
    s, body = http(
        "GET",
        f"ordenes_compra?select=id,numero,estado&proyecto_id=in.({ids_in})",
    )
    try:
        ocs = json.loads(body)
    except Exception:
        ocs = []
    if ocs:
        print(f"  {len(ocs)} OCs vinculadas (las desvinculo, no las borro):")
        for o in ocs:
            print(f"    {o['numero']:<15} estado={o['estado']}")
        if not DRY_RUN:
            ds, db = http(
                "PATCH",
                f"ordenes_compra?proyecto_id=in.({ids_in})",
                body={"proyecto_id": None},
                prefer="return=minimal",
            )
            print(f"  → desvinculadas status {ds}")
    else:
        print("  Ninguna")

    # Desvincular CFDIs (igual)
    print("\n=== 4. Desvincular CFDIs ===")
    s, body = http(
        "GET",
        f"cfdi?select=id,uuid,total&proyecto_id=in.({ids_in})",
    )
    try:
        cfdis = json.loads(body)
    except Exception:
        cfdis = []
    if cfdis:
        print(f"  {len(cfdis)} CFDIs vinculados, los desvinculo")
        if not DRY_RUN:
            ds, db = http(
                "PATCH",
                f"cfdi?proyecto_id=in.({ids_in})",
                body={"proyecto_id": None},
                prefer="return=minimal",
            )
            print(f"  → desvinculados status {ds}")
    else:
        print("  Ninguno")

    # OTs (igual desvinculo)
    print("\n=== 5. Desvincular OTs inter-co ===")
    for col in ["proyecto_id", "proyecto_destino_id"]:
        s, body = http(
            "GET",
            f"ordenes_trabajo_inter_co?select=id&{col}=in.({ids_in})",
        )
        try:
            ots = json.loads(body)
        except Exception:
            ots = []
        if ots:
            print(f"  {len(ots)} OTs vía {col}, desvinculo")
            if not DRY_RUN:
                http(
                    "PATCH",
                    f"ordenes_trabajo_inter_co?{col}=in.({ids_in})",
                    body={col: None},
                    prefer="return=minimal",
                )

    # Levantamientos (igual)
    print("\n=== 6. Desvincular levantamientos ===")
    for col in ["proyecto_origen_id", "proyecto_destino_id"]:
        s, body = http(
            "GET",
            f"levantamientos?select=id&{col}=in.({ids_in})",
        )
        try:
            ls = json.loads(body)
        except Exception:
            ls = []
        if ls:
            print(f"  {len(ls)} levantamientos vía {col}, desvinculo")
            if not DRY_RUN:
                http(
                    "PATCH",
                    f"levantamientos?{col}=in.({ids_in})",
                    body={col: None},
                    prefer="return=minimal",
                )

    # Borrar los proyectos
    print("\n=== 7. Borrar los proyectos ===")
    if not DRY_RUN:
        ds, db = http(
            "DELETE",
            f"proyectos?id=in.({ids_in})",
            prefer="return=minimal",
        )
        if ds in (200, 204):
            print(f"  ✓ {len(proyectos)} proyectos eliminados")
        else:
            print(f"  ERROR {ds}: {db[:300]}")
    else:
        print(f"  (dry-run) borraría {len(proyectos)} proyectos")

    print("\n✓ Operación completa.")


if __name__ == "__main__":
    main()
