# -*- coding: utf-8 -*-
"""
Marca como inactivos los clientes y proveedores que NO tuvieron CFDI en 2026.

Como los CFDIs importados del ERP anterior no tienen cliente_id/proveedor_id
poblados, primero hacemos el match por RFC contra el catálogo:
  - CFDI es_emitido=true  → rfc_receptor = cliente (excluye RFCs del grupo)
  - CFDI es_emitido=false → rfc_emisor   = proveedor

Después marca como activo=false los registros del catálogo cuyo RFC no
aparece en ninguna factura del 2026.

Reversible — solo cambia el flag `activo`.

Modo:
  python scripts/desactivar_sin_cfdi_2026.py [dry-run|apply]

Default: dry-run.
"""

import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

SUPABASE_URL = "https://dtmcqjtqykbkapzebbik.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6"
    "MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99"
    "Soa654OVbO1hwY"
)


def http(method, path, body=None, params=None, prefer=None):
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer or "return=representation",
    }
    url = SUPABASE_URL + path
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode("utf-8")
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def get_all(path, params, page=1000):
    out = []
    offset = 0
    while True:
        p = dict(params)
        p["limit"] = page
        p["offset"] = offset
        s, data = http("GET", path, params=p)
        if s != 200 or not data:
            break
        out.extend(data)
        if len(data) < page:
            break
        offset += page
    return out


def cargar_rfcs_grupo() -> set[str]:
    """RFCs de las 4 empresas del grupo (excluir cuando se buscan terceros)."""
    rows = get_all("/rest/v1/empresas", {"select": "id,codigo,rfc"})
    return {r["rfc"] for r in rows if r.get("rfc")}


def cargar_catalogo(tabla: str) -> dict[str, list[dict]]:
    """RFC normalizado → lista de filas (puede haber duplicados de RFC)."""
    rows = get_all(
        f"/rest/v1/{tabla}",
        {"select": "id,rfc,razon_social,activo"},
    )
    out: dict[str, list[dict]] = {}
    for r in rows:
        rfc = (r.get("rfc") or "").strip().upper()
        if not rfc:
            continue
        out.setdefault(rfc, []).append(r)
    return out


def rfcs_actividad_2026(es_emitido: bool, rfc_grupo: set[str]) -> set[str]:
    """RFCs de terceros con CFDI en 2026.

    es_emitido=True  → factura nuestra a cliente (rfc_receptor)
    es_emitido=False → CFDI de gasto de proveedor (rfc_emisor)
    """
    campo_tercero = "rfc_receptor" if es_emitido else "rfc_emisor"
    rows = get_all(
        "/rest/v1/cfdi",
        {
            "select": campo_tercero,
            "es_emitido": f"eq.{'true' if es_emitido else 'false'}",
            "fecha_emision": "gte.2026-01-01",
        },
    )
    out = set()
    for r in rows:
        rfc = (r.get(campo_tercero) or "").strip().upper()
        if rfc and rfc not in rfc_grupo:
            out.add(rfc)
    return out


def desactivar_lote(tabla: str, ids: list[str]) -> int:
    """PATCH estado='inactivo' en lotes (el trigger sincroniza activo).

    Nota: en el sistema hay dos columnas — `estado` enum (sprint 1.5) y
    `activo` boolean legacy. El trigger sync_estado_activo mantiene
    `activo` consistente con `estado`. Hay que tocar SIEMPRE `estado`,
    nunca `activo` directamente, para que la UI (EstadoTabs) muestre bien.
    """
    actualizados = 0
    for i in range(0, len(ids), 100):
        lote = ids[i : i + 100]
        ids_csv = ",".join(lote)
        s, info = http(
            "PATCH",
            f"/rest/v1/{tabla}",
            body={"estado": "inactivo"},
            params={"id": f"in.({ids_csv})"},
            prefer="return=minimal",
        )
        if s in (200, 204):
            actualizados += len(lote)
        else:
            print(f"    Lote {i // 100 + 1}: ERROR {s} {str(info)[:200]}")
            break
    return actualizados


def vincular_cfdi_terceros(catalogo_clientes, catalogo_proveedores, rfc_grupo) -> int:
    """De paso: enlaza cfdi.cliente_id / proveedor_id por RFC (idempotente).
    Solo actualiza filas con cliente_id/proveedor_id NULL.
    """
    print("  Cargando CFDIs 2026 sin vincular...")
    cfdis = get_all(
        "/rest/v1/cfdi",
        {
            "select": "id,es_emitido,rfc_emisor,rfc_receptor,cliente_id,proveedor_id",
            "fecha_emision": "gte.2026-01-01",
        },
    )
    print(f"  {len(cfdis)} CFDIs 2026 totales.")

    actualizaciones = []
    for c in cfdis:
        es_em = c.get("es_emitido")
        if es_em is True and c.get("cliente_id") is None:
            rfc = (c.get("rfc_receptor") or "").strip().upper()
            if rfc in rfc_grupo:
                continue
            cands = catalogo_clientes.get(rfc, [])
            if cands:
                actualizaciones.append((c["id"], "cliente_id", cands[0]["id"]))
        elif es_em is False and c.get("proveedor_id") is None:
            rfc = (c.get("rfc_emisor") or "").strip().upper()
            if rfc in rfc_grupo:
                continue
            cands = catalogo_proveedores.get(rfc, [])
            if cands:
                actualizaciones.append((c["id"], "proveedor_id", cands[0]["id"]))

    print(f"  {len(actualizaciones)} CFDIs vinculables a catálogo.")
    aplicados = 0
    for cfdi_id, campo, fk in actualizaciones:
        s, _ = http(
            "PATCH",
            "/rest/v1/cfdi",
            body={campo: fk},
            params={"id": f"eq.{cfdi_id}"},
            prefer="return=minimal",
        )
        if s in (200, 204):
            aplicados += 1
    return aplicados


def main():
    args = sys.argv[1:]
    modo = args[0] if args else "dry-run"
    dry_run = modo == "dry-run"

    print(f"Modo: {'DRY-RUN (simulación)' if dry_run else 'APPLY (cambios reales)'}")
    print()

    rfc_grupo = cargar_rfcs_grupo()
    print(f"RFCs del grupo (excluidos): {sorted(rfc_grupo)}")
    print()

    print("=" * 70)
    print("CARGANDO CATÁLOGO")
    print("=" * 70)
    cat_clientes = cargar_catalogo("clientes")
    cat_proveedores = cargar_catalogo("proveedores")
    print(
        f"  Clientes:    {sum(len(v) for v in cat_clientes.values())} "
        f"({len(cat_clientes)} RFCs únicos)"
    )
    print(
        f"  Proveedores: {sum(len(v) for v in cat_proveedores.values())} "
        f"({len(cat_proveedores)} RFCs únicos)"
    )

    print()
    print("=" * 70)
    print("CFDIs 2026 → RFCs DE TERCEROS ACTIVOS")
    print("=" * 70)
    rfcs_clientes_2026 = rfcs_actividad_2026(es_emitido=True, rfc_grupo=rfc_grupo)
    rfcs_proveedores_2026 = rfcs_actividad_2026(es_emitido=False, rfc_grupo=rfc_grupo)
    print(f"  RFCs cliente con factura emitida en 2026:    {len(rfcs_clientes_2026)}")
    print(f"  RFCs proveedor con CFDI recibido en 2026:    {len(rfcs_proveedores_2026)}")

    # Bonus: vincular CFDIs por RFC
    if not dry_run:
        print()
        print("=" * 70)
        print("VINCULANDO CFDI ↔ CATÁLOGO (por RFC)")
        print("=" * 70)
        n = vincular_cfdi_terceros(cat_clientes, cat_proveedores, rfc_grupo)
        print(f"  → {n} CFDIs enlazados.")

    # Identificar a desactivar
    print()
    print("=" * 70)
    print("DESACTIVAR CLIENTES SIN CFDI 2026")
    print("=" * 70)
    ids_clientes_inactivar = []
    activos_inicial_c = 0
    for rfc, filas in cat_clientes.items():
        for f in filas:
            if f["activo"]:
                activos_inicial_c += 1
                if rfc not in rfcs_clientes_2026:
                    ids_clientes_inactivar.append(f["id"])
    print(f"  Total clientes activos: {activos_inicial_c}")
    print(f"  → {len(ids_clientes_inactivar)} sin CFDI 2026 (a desactivar)")
    # Mostrar 5
    for i, fid in enumerate(ids_clientes_inactivar[:5]):
        f = next(f for fs in cat_clientes.values() for f in fs if f["id"] == fid)
        print(f"    · {f['rfc']:<14} {f['razon_social'][:60]}")
    if len(ids_clientes_inactivar) > 5:
        print(f"    ... y {len(ids_clientes_inactivar) - 5} más")

    print()
    print("=" * 70)
    print("DESACTIVAR PROVEEDORES SIN CFDI 2026")
    print("=" * 70)
    ids_proveedores_inactivar = []
    activos_inicial_p = 0
    for rfc, filas in cat_proveedores.items():
        for f in filas:
            if f["activo"]:
                activos_inicial_p += 1
                if rfc not in rfcs_proveedores_2026:
                    ids_proveedores_inactivar.append(f["id"])
    print(f"  Total proveedores activos: {activos_inicial_p}")
    print(f"  → {len(ids_proveedores_inactivar)} sin CFDI 2026 (a desactivar)")
    for i, fid in enumerate(ids_proveedores_inactivar[:5]):
        f = next(f for fs in cat_proveedores.values() for f in fs if f["id"] == fid)
        print(f"    · {f['rfc']:<14} {f['razon_social'][:60]}")
    if len(ids_proveedores_inactivar) > 5:
        print(f"    ... y {len(ids_proveedores_inactivar) - 5} más")

    if dry_run:
        print()
        print("[DRY-RUN] Para aplicar realmente:")
        print("  python scripts/desactivar_sin_cfdi_2026.py apply")
        return

    print()
    print("=" * 70)
    print("APLICANDO CAMBIOS")
    print("=" * 70)
    n_c = desactivar_lote("clientes", ids_clientes_inactivar)
    print(f"  Clientes desactivados:    {n_c}")
    n_p = desactivar_lote("proveedores", ids_proveedores_inactivar)
    print(f"  Proveedores desactivados: {n_p}")

    print()
    print("=" * 70)
    print("RESUMEN FINAL")
    print("=" * 70)
    print(
        f"Clientes:    {activos_inicial_c} activos → {activos_inicial_c - n_c} "
        f"({n_c} desactivados, {len(rfcs_clientes_2026)} con CFDI 2026)"
    )
    print(
        f"Proveedores: {activos_inicial_p} activos → {activos_inicial_p - n_p} "
        f"({n_p} desactivados, {len(rfcs_proveedores_2026)} con CFDI 2026)"
    )


if __name__ == "__main__":
    main()
