# -*- coding: utf-8 -*-
"""
Carga la lista 69-B del SAT y flagea clientes/proveedores que aparezcan.

La lista 69-B identifica contribuyentes con operaciones presuntamente
inexistentes ("EFOS"). Estados:
  - Definitivo:           CONFIRMADO. Negro absoluto.
  - Presunto:             En investigación. Rojo.
  - Desvirtuado / Sent.   Exonerado. Solo nota informativa.

Acciones:
  - Proveedores: semaforo = 'negro' (definitivo) | 'rojo' (presunto)
                 esta_aprobado = FALSE
                 observaciones añadidas con fecha y oficio
  - Clientes:    riesgo = 'alto' (definitivo o presunto)
                 observaciones añadidas

Uso:
  python scripts/flagear_lista_69b.py "ruta\\al\\Listado_69B.csv" [dry-run|apply]

Default: dry-run.
"""

import csv
import json
import re
import sys
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


def parsear_csv_69b(path: Path):
    """Devuelve dict: rfc → {situacion, nombre, oficio_definitivo, fecha_publicacion}"""
    rows = {}
    encodings = ["utf-8-sig", "latin-1", "cp1252"]
    text = None
    for enc in encodings:
        try:
            text = path.read_text(encoding=enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise RuntimeError("No se pudo decodificar el CSV.")

    reader = csv.reader(text.splitlines())
    # Header está en la línea 3 (las primeras 2 son disclaimer + título)
    header_idx = -1
    rows_iter = list(reader)
    for i, r in enumerate(rows_iter):
        if r and r[0] == "No":
            header_idx = i
            break
    if header_idx < 0:
        raise RuntimeError("Header no encontrado.")

    header = rows_iter[header_idx]
    # Encontrar índices de columnas
    col_rfc = header.index("RFC")
    col_nombre = next(
        i for i, h in enumerate(header) if "Nombre del Contribuyente" in h
    )
    col_situacion = next(
        i for i, h in enumerate(header) if "Situaci" in h and "contribuyente" in h
    )
    col_oficio_def = next(
        (i for i, h in enumerate(header) if "definitivos SAT" in h), -1
    )
    col_pub_def = next(
        (i for i, h in enumerate(header) if "definitivos" in h and "SAT" in h),
        -1,
    )

    for r in rows_iter[header_idx + 1 :]:
        if len(r) < 4:
            continue
        rfc = (r[col_rfc] or "").strip().upper()
        if not rfc or not re.match(r"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$", rfc):
            continue
        rows[rfc] = {
            "rfc": rfc,
            "nombre": r[col_nombre].strip().strip('"'),
            "situacion": r[col_situacion].strip(),
            "oficio_def": r[col_oficio_def].strip() if col_oficio_def >= 0 else "",
            "pub_def": r[col_pub_def].strip() if col_pub_def >= 0 else "",
        }
    return rows


def normalizar_situacion(sit: str) -> str:
    s = (sit or "").lower()
    if "definitivo" in s:
        return "definitivo"
    if "presunto" in s:
        return "presunto"
    if "desvirtu" in s:
        return "desvirtuado"
    if "sentencia" in s and "favorable" in s:
        return "sentencia_favorable"
    return "otro"


def main():
    args = sys.argv[1:]
    if not args:
        print("Falta la ruta al CSV.")
        print("Uso: python scripts/flagear_lista_69b.py <ruta.csv> [dry-run|apply]")
        sys.exit(1)
    csv_path = Path(args[0])
    if not csv_path.exists():
        print(f"No existe: {csv_path}")
        sys.exit(1)
    modo = args[1] if len(args) > 1 else "dry-run"
    dry_run = modo == "dry-run"

    print(f"Modo: {'DRY-RUN' if dry_run else 'APPLY'}")
    print(f"CSV : {csv_path}")
    print()

    print("Parseando CSV 69-B...")
    lista = parsear_csv_69b(csv_path)
    print(f"  Total RFCs en lista: {len(lista)}")
    by_status: dict[str, int] = {}
    for r in lista.values():
        k = normalizar_situacion(r["situacion"])
        by_status[k] = by_status.get(k, 0) + 1
    for k in ("definitivo", "presunto", "desvirtuado", "sentencia_favorable", "otro"):
        if k in by_status:
            print(f"    · {k:<22} {by_status[k]}")
    print()

    print("Cargando catálogo de clientes y proveedores...")
    cli_rows = get_all(
        "/rest/v1/clientes",
        {"select": "id,rfc,razon_social,riesgo,observaciones,activo"},
    )
    pro_rows = get_all(
        "/rest/v1/proveedores",
        {"select": "id,rfc,razon_social,semaforo,esta_aprobado,observaciones,activo"},
    )
    print(f"  Clientes:    {len(cli_rows)}")
    print(f"  Proveedores: {len(pro_rows)}")
    print()

    # Match
    matches_cli: list[tuple[dict, dict]] = []
    for c in cli_rows:
        rfc = (c.get("rfc") or "").strip().upper()
        if rfc in lista:
            matches_cli.append((c, lista[rfc]))

    matches_pro: list[tuple[dict, dict]] = []
    for p in pro_rows:
        rfc = (p.get("rfc") or "").strip().upper()
        if rfc in lista:
            matches_pro.append((p, lista[rfc]))

    print("=" * 70)
    print(f"CLIENTES en lista 69-B: {len(matches_cli)}")
    print("=" * 70)
    for c, sat in matches_cli:
        print(
            f"  {c['rfc']:<14} {c['razon_social'][:50]:<50} "
            f"[{normalizar_situacion(sat['situacion'])}]"
        )

    print()
    print("=" * 70)
    print(f"PROVEEDORES en lista 69-B: {len(matches_pro)}")
    print("=" * 70)
    for p, sat in matches_pro:
        print(
            f"  {p['rfc']:<14} {p['razon_social'][:50]:<50} "
            f"[{normalizar_situacion(sat['situacion'])}]"
        )

    if dry_run:
        print()
        print("[DRY-RUN] Para aplicar:")
        print(f"  python scripts/flagear_lista_69b.py \"{csv_path}\" apply")
        return

    if not matches_cli and not matches_pro:
        print("\nNo hay coincidencias — nada que aplicar.")
        return

    print()
    print("=" * 70)
    print("APLICANDO FLAGS")
    print("=" * 70)

    n_cli, n_pro = 0, 0

    for c, sat in matches_cli:
        situacion = normalizar_situacion(sat["situacion"])
        if situacion in ("desvirtuado", "sentencia_favorable"):
            # exonerados — solo nota informativa, no cambiar riesgo
            nota = (
                f"[69-B {situacion.upper()}] {sat['nombre']} — "
                f"oficio: {sat['oficio_def']}. Estaba en lista pero exonerado."
            )
            riesgo_nuevo = c.get("riesgo") or "bajo"
        else:
            nota = (
                f"[69-B {situacion.upper()}] {sat['nombre']} — "
                f"oficio: {sat['oficio_def']}, publicado: {sat['pub_def']}"
            )
            riesgo_nuevo = "alto"

        obs_actual = c.get("observaciones") or ""
        if "[69-B" in obs_actual:
            obs_nueva = obs_actual  # ya marcado
        else:
            obs_nueva = (obs_actual + "\n" + nota).strip()

        s, _ = http(
            "PATCH",
            "/rest/v1/clientes",
            body={"riesgo": riesgo_nuevo, "observaciones": obs_nueva},
            params={"id": f"eq.{c['id']}"},
            prefer="return=minimal",
        )
        if s in (200, 204):
            n_cli += 1

    for p, sat in matches_pro:
        situacion = normalizar_situacion(sat["situacion"])
        if situacion == "definitivo":
            semaforo = "negro"
            esta_aprobado = False
        elif situacion == "presunto":
            semaforo = "rojo"
            esta_aprobado = False
        else:
            # desvirtuado / sentencia_favorable: dejar semáforo como está
            semaforo = p.get("semaforo") or "verde"
            esta_aprobado = p.get("esta_aprobado")

        nota = (
            f"[69-B {situacion.upper()}] {sat['nombre']} — "
            f"oficio: {sat['oficio_def']}, publicado: {sat['pub_def']}"
        )
        obs_actual = p.get("observaciones") or ""
        if "[69-B" in obs_actual:
            obs_nueva = obs_actual
        else:
            obs_nueva = (obs_actual + "\n" + nota).strip()

        body: dict = {"semaforo": semaforo, "observaciones": obs_nueva}
        if esta_aprobado is not None:
            body["esta_aprobado"] = esta_aprobado

        s, _ = http(
            "PATCH",
            "/rest/v1/proveedores",
            body=body,
            params={"id": f"eq.{p['id']}"},
            prefer="return=minimal",
        )
        if s in (200, 204):
            n_pro += 1

    print(f"  Clientes flageados:    {n_cli}")
    print(f"  Proveedores flageados: {n_pro}")

    # Actualizar tracking (lista_69b_meta) — el cron diario revisa este flag
    # y crea notificación si pasaron >180 días desde la última actualización.
    print()
    print("Actualizando tracking lista_69b_meta...")
    counts: dict[str, int] = {}
    for r in lista.values():
        k = normalizar_situacion(r["situacion"])
        counts[k] = counts.get(k, 0) + 1
    from datetime import date
    meta_payload = {
        "id": 1,
        "ultima_actualizacion": date.today().isoformat(),
        "total_rfcs": len(lista),
        "total_definitivos": counts.get("definitivo", 0),
        "total_presuntos": counts.get("presunto", 0),
        "total_desvirtuados": counts.get("desvirtuado", 0),
        "total_sentencia_favorable": counts.get("sentencia_favorable", 0),
        "fuente_csv": str(csv_path.name),
        "matches_clientes": n_cli,
        "matches_proveedores": n_pro,
        "ultima_alerta_enviada_at": None,
        "observaciones": f"Importado por script. Próxima revisión recomendada: 6 meses.",
    }
    s, info = http(
        "POST",
        "/rest/v1/lista_69b_meta",
        body=meta_payload,
        params={"on_conflict": "id"},
        prefer="resolution=merge-duplicates,return=minimal",
    )
    if s in (200, 201, 204):
        print(f"  ✓ Tracking actualizado. La alerta se reseteará por 6 meses.")
    else:
        print(f"  ⚠ No se pudo actualizar tracking: {s} {str(info)[:200]}")


if __name__ == "__main__":
    main()
