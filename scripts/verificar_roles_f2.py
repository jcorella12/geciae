# -*- coding: utf-8 -*-
"""
ROLES Fase 2 — Verificación de acceso antes/después de la migración RLS.

FLUJO (el operador lo corre en dos momentos):
    # 1) ANTES de aplicar las migraciones — captura el baseline:
    SUPABASE_ACCESS_TOKEN=sbp_... python scripts/verificar_roles_f2.py --baseline
    # 2) supabase db push  (aplica 20260708000000 + 20260708000100)
    # 3) DESPUÉS — compara contra el baseline:
    SUPABASE_ACCESS_TOKEN=sbp_... python scripts/verificar_roles_f2.py

INVARIANTE (migración aditiva/expand): ningún usuario actual debe PERDER acceso.
  · after < before  → ✗ REGRESIÓN (falla).
  · after > before  → ℹ ganó acceso (ESPERADO: directivo obtiene override global).
  · after = before  → ✓ sin cambios.

Mide, por cada usuario real, en una sesión simulada (set_config de claims):
  · count(*) visible en tablas representativas de cada patrón de política.
  · valor de los helpers clave (usuario_es_ceo, ver_estados/ajustes_gerenciales,
    gestionar_catalogos) — 1/0.
"""
import json
import os
import sys
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding="utf-8")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN") or os.environ.get("SBP_TOKEN")
PROJECT = "dtmcqjtqykbkapzebbik"
BASELINE = "scripts/roles-f2-baseline.json"

# Tablas elegidas para ejercitar los distintos patrones de política:
#   operación amplia (arrays ceo/director/operativo): proyectos, clientes, ordenes_compra
#   empleados (array ceo/director, sensible):          empleados
#   empresas_del_usuario OR usuario_es_ceo:            cfdi, bancos_cuentas,
#                                                      gastos_recurrentes, cotizaciones, vehiculos
#   prestamos:                                         prestamos_activos
#   gerencial (usuario_es_ceo / estados_gerenciales):  ajustes_gerenciales,
#                                                      balance_gerencial_snapshots
TABLAS = [
    "proyectos", "clientes", "ordenes_compra", "empleados",
    "cfdi", "bancos_cuentas", "gastos_recurrentes", "cotizaciones",
    "vehiculos", "prestamos_activos",
    "ajustes_gerenciales", "balance_gerencial_snapshots",
]
HELPERS = [
    "usuario_es_ceo()",
    "usuario_puede_ver_estados_gerenciales()",
    "usuario_puede_ver_ajustes_gerenciales()",
    "usuario_puede_gestionar_catalogos()",
]
# Atributos de módulos retirados que la migración SÍ debe limpiar.
ATTRS_MUERTOS = ["coordinador_calidad"]


def q(sql):
    body = json.dumps({"query": sql}).encode()
    r = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        data=body, method="POST",
        headers={"Authorization": f"Bearer {TOKEN}",
                 "Content-Type": "application/json", "User-Agent": "curl/8.4.0"})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return {"__err__": e.read().decode()[:300]}


def snapshot():
    """Acceso simulado por usuario: {email: {clave: n}}."""
    users = q("""SELECT DISTINCT u.email, u.id::text AS id FROM usuarios_empresas ue
                 JOIN auth.users u ON u.id=ue.usuario_id WHERE ue.activo=TRUE ORDER BY u.email""")
    if not isinstance(users, list):
        sys.exit(f"No se pudo listar usuarios: {users}")
    partes = [f"SELECT '{t}' k, count(*)::int n FROM {t}" for t in TABLAS]
    partes += [f"SELECT '{h}' k, {h}::int n" for h in HELPERS]
    union = " UNION ALL ".join(partes)
    out = {}
    for u in users:
        sql = (f"SET LOCAL ROLE authenticated;"
               f"SELECT set_config('request.jwt.claims',"
               f"'{{\"sub\":\"{u['id']}\",\"role\":\"authenticated\"}}',true);"
               f"{union};")
        r = q(sql)
        if isinstance(r, list):
            out[u["email"]] = {x["k"]: x["n"] for x in r}
        else:
            out[u["email"]] = {"__err__": str(r)}
    return out


def main():
    if not TOKEN:
        sys.exit("Falta SUPABASE_ACCESS_TOKEN / SBP_TOKEN en el entorno")

    if "--baseline" in sys.argv:
        snap = snapshot()
        with open(BASELINE, "w", encoding="utf-8") as f:
            json.dump(snap, f, indent=2, ensure_ascii=False)
        print(f"✅ Baseline guardado en {BASELINE} ({len(snap)} usuarios, "
              f"{len(TABLAS)} tablas + {len(HELPERS)} helpers).")
        for email, fila in snap.items():
            print(f"  {email}: {fila}")
        return

    try:
        with open(BASELINE, encoding="utf-8") as f:
            baseline = json.load(f)
    except FileNotFoundError:
        sys.exit(f"No existe {BASELINE}. Corre primero con --baseline ANTES de migrar.")

    ok = True
    print("=== 1. Acceso por usuario: después vs baseline ===")
    actual = snapshot()
    claves = TABLAS + HELPERS
    for email, fila in actual.items():
        base = baseline.get(email, {})
        perdidas, ganancias = [], []
        for k in claves:
            b, a = base.get(k), fila.get(k)
            if b is None or a is None:
                continue
            if a < b:
                perdidas.append(f"{k} {b}→{a}")
            elif a > b:
                ganancias.append(f"{k} {b}→{a}")
        if perdidas:
            ok = False
            print(f"  ✗ {email}: PERDIÓ acceso → {', '.join(perdidas)}")
        if ganancias:
            print(f"  ℹ {email}: ganó acceso (esperado) → {', '.join(ganancias)}")
        if not perdidas and not ganancias:
            print(f"  ✓ {email}: sin cambios")

    print("\n=== 2. Cobertura del rewrite de políticas ===")
    r = q("""SELECT count(*) FILTER (WHERE qual LIKE '%rol_usuario%' OR with_check LIKE '%rol_usuario%') con_rol,
      count(*) FILTER (WHERE (qual LIKE '%rol_usuario%' OR with_check LIKE '%rol_usuario%')
        AND coalesce(qual,'') NOT LIKE '%directivo%' AND coalesce(with_check,'') NOT LIKE '%directivo%') sin_directivo
      FROM pg_policies WHERE schemaname='public'""")
    if isinstance(r, list):
        x = r[0]
        print(f"  políticas con literal de rol: {x['con_rol']}")
        if x["sin_directivo"] > 0:
            ok = False
            print(f"  ✗ {x['sin_directivo']} políticas con literal de rol SIN 'directivo' (no cubiertas):")
            r2 = q("""SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'
              AND (qual LIKE '%rol_usuario%' OR with_check LIKE '%rol_usuario%')
              AND coalesce(qual,'') NOT LIKE '%directivo%' AND coalesce(with_check,'') NOT LIKE '%directivo%'""")
            for p in (r2 if isinstance(r2, list) else [])[:30]:
                print(f"      {p['tablename']}.{p['policyname']}")
        else:
            print("  ✓ todas las políticas con literal de rol incluyen 'directivo'")

    print("\n=== 3. Datos: roles y atributos ===")
    r = q("SELECT rol::text rol, count(*) n FROM usuarios_empresas GROUP BY rol ORDER BY rol")
    if isinstance(r, list):
        validos = ("directivo", "administrativo", "operativo", "cliente")
        for x in r:
            viejo = x["rol"] not in validos
            if viejo:
                ok = False
            print(f"  rol={x['rol']}: {x['n']}{' ✗ rol viejo sin migrar!' if viejo else ''}")
    arr = "ARRAY[" + ",".join(f"'{a}'" for a in ATTRS_MUERTOS) + "]"
    r = q(f"SELECT count(*) n FROM usuarios_empresas WHERE atributos && {arr}")
    if isinstance(r, list):
        n = r[0]["n"]
        if n > 0:
            ok = False
            print(f"  ✗ {n} filas con atributos de módulos retirados ({ATTRS_MUERTOS}) sin limpiar")
        else:
            print(f"  ✓ sin atributos de módulos retirados ({ATTRS_MUERTOS})")

    print("\n" + ("✅ VERIFICACIÓN OK — nadie perdió acceso, rewrite y datos correctos"
                  if ok else "❌ HAY REGRESIONES — revisar arriba"))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
