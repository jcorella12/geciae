# -*- coding: utf-8 -*-
"""
Seed dummy P&L data para 5 proyectos activos. SOLO para demo — borrable.

Crea:
- proyecto_presupuesto: ingreso, presupuestos por categoría, margen objetivo
- proyecto_costos_imputados: 2-4 ajustes por proyecto
- proyecto_horas_trabajadas: horas de ingeniería + cuadrillas

Para borrar:
  python scripts/seed_pnl_demo.py limpiar
"""

import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse
import random
from datetime import date, timedelta

sys.stdout.reconfigure(encoding="utf-8")

SUPABASE_URL = "https://dtmcqjtqykbkapzebbik.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6"
    "MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99"
    "Soa654OVbO1hwY"
)

# Marcamos los registros con observaciones para identificarlos al borrar
SEED_TAG = "[SEED-DEMO]"


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


def lunes_de(fecha: date) -> date:
    return fecha - timedelta(days=fecha.weekday())


def cmd_sembrar():
    print("=" * 70)
    print("SEED P&L DEMO")
    print("=" * 70)

    # CEO usuario para capturar
    s, users = http(
        "GET",
        "/rest/v1/usuarios_empresas",
        params={"select": "usuario_id", "rol": "eq.ceo", "limit": 1},
    )
    if not users:
        print("✗ No se encontró usuario CEO.")
        return
    ceo_id = users[0]["usuario_id"]

    # 5 proyectos más grandes
    s, proyectos = http(
        "GET",
        "/rest/v1/proyectos",
        params={
            "select": "id,codigo,nombre,empresa_id,monto_contratado",
            "estado": "in.(en_ejecucion,planeacion,en_cierre)",
            "monto_contratado": "gt.0",
            "order": "monto_contratado.desc",
            "limit": 5,
        },
    )
    print(f"Proyectos: {len(proyectos)}")
    for p in proyectos:
        print(f"  {p['codigo']:15s} ${(p['monto_contratado'] or 0):>14,.0f}")
    print()

    presupuestos_creados = 0
    costos_imp_creados = 0
    horas_creadas = 0

    for p in proyectos:
        ingreso = float(p["monto_contratado"] or 1000000)

        # Presupuesto por categorías (% del ingreso, randomizado un poco)
        pct_materiales = 0.45 + random.uniform(-0.05, 0.05)
        pct_ing = 0.05 + random.uniform(-0.01, 0.02)
        pct_campo = 0.10 + random.uniform(-0.02, 0.03)
        pct_sub = 0.08 + random.uniform(-0.02, 0.03)
        pct_indirectos = 0.05 + random.uniform(-0.01, 0.02)

        presupuesto = {
            "proyecto_id": p["id"],
            "ingreso_total": ingreso,
            "presupuesto_materiales": round(ingreso * pct_materiales, 2),
            "presupuesto_mano_obra_ingenieria": round(ingreso * pct_ing, 2),
            "presupuesto_mano_obra_campo": round(ingreso * pct_campo, 2),
            "presupuesto_subcontratos": round(ingreso * pct_sub, 2),
            "presupuesto_activos_compartidos": 0,
            "presupuesto_logistica": round(ingreso * 0.02, 2),
            "presupuesto_indirectos": round(ingreso * pct_indirectos, 2),
            "presupuesto_otros": 0,
            "porcentaje_provision_garantia": 3.0,
            "margen_objetivo_pct": round(25 + random.uniform(-3, 5), 1),
            "capturado_por": ceo_id,
            "observaciones": f"{SEED_TAG} Presupuesto demo generado automáticamente.",
        }

        s, resp = http(
            "POST",
            "/rest/v1/proyecto_presupuesto",
            body=presupuesto,
            params={"on_conflict": "proyecto_id"},
            prefer="resolution=merge-duplicates,return=minimal",
        )
        if s in (200, 201, 204):
            presupuestos_creados += 1
            print(f"  ✓ Presupuesto {p['codigo']}: ${ingreso:,.0f}")
        else:
            print(f"  ✗ Presupuesto {p['codigo']}: {s} {str(resp)[:200]}")
            continue

        # Costos imputados (2-3 por proyecto)
        n_costos = random.randint(2, 3)
        categorias_costo = [
            ("provision_garantia", "garantia_provision", "Provisión garantía 3%", round(ingreso * 0.03, 2)),
            ("ajuste_manual", "otros", "Ajuste por gastos no facturados", round(ingreso * random.uniform(0.005, 0.015), 2)),
            ("viaticos_no_facturados", "logistica", "Viáticos cuadrilla campo", round(ingreso * random.uniform(0.003, 0.008), 2)),
            ("subcontrato_externo", "subcontratos", "Servicio especializado externo", round(ingreso * random.uniform(0.01, 0.025), 2)),
        ]
        seleccionados = random.sample(categorias_costo, k=n_costos)
        for tipo, categoria, concepto, monto in seleccionados:
            fecha = (date.today() - timedelta(days=random.randint(5, 60))).isoformat()
            s, resp = http(
                "POST",
                "/rest/v1/proyecto_costos_imputados",
                body={
                    "proyecto_id": p["id"],
                    "empresa_id": p["empresa_id"],
                    "fecha": fecha,
                    "tipo": tipo,
                    "categoria": categoria,
                    "concepto": f"{SEED_TAG} {concepto}",
                    "monto": monto,
                    "justificacion": f"{SEED_TAG} Generado automáticamente para demo del módulo P&L.",
                    "capturado_por": ceo_id,
                },
                prefer="return=minimal",
            )
            if s in (200, 201, 204):
                costos_imp_creados += 1

        # Horas trabajadas (4-6 semanas hacia atrás)
        n_semanas = random.randint(3, 6)
        for w in range(n_semanas):
            inicio = lunes_de(date.today() - timedelta(weeks=w))
            fin = inicio + timedelta(days=6)

            # Horas de ingeniería (sin empleado_id porque seria UUID — usamos campo estimado solo)
            # Cuadrilla
            num_personas = random.randint(2, 5)
            horas_personas = num_personas * random.randint(35, 45)
            tarifa_campo = random.choice([180, 200, 220, 250])
            s, resp = http(
                "POST",
                "/rest/v1/proyecto_horas_trabajadas",
                body={
                    "proyecto_id": p["id"],
                    "registrado_por": ceo_id,
                    "tipo": "campo_estimado",
                    "semana_inicio": inicio.isoformat(),
                    "semana_fin": fin.isoformat(),
                    "horas": horas_personas,
                    "cuadrilla_descripcion": f"{SEED_TAG} Cuadrilla {chr(65+w%3)} - {num_personas} técnicos",
                    "num_personas": num_personas,
                    "tarifa_aplicada": tarifa_campo,
                    "observaciones": f"{SEED_TAG} Horas demo de campo.",
                },
                prefer="return=minimal",
            )
            if s in (200, 201, 204):
                horas_creadas += 1

    print()
    print(f"{'='*70}\nRESUMEN")
    print(f"  Presupuestos creados:    {presupuestos_creados}")
    print(f"  Costos imputados creados: {costos_imp_creados}")
    print(f"  Semanas de horas creadas: {horas_creadas}")


def cmd_limpiar():
    print("=" * 70)
    print("LIMPIANDO SEED P&L DEMO")
    print("=" * 70)

    # Borrar costos imputados con tag
    s, _ = http(
        "DELETE",
        "/rest/v1/proyecto_costos_imputados",
        params={"observaciones": f"like.{SEED_TAG}*"},
        prefer="return=minimal",
    )
    s2, _ = http(
        "DELETE",
        "/rest/v1/proyecto_costos_imputados",
        params={"justificacion": f"like.{SEED_TAG}*"},
        prefer="return=minimal",
    )

    # Borrar horas con tag
    s3, _ = http(
        "DELETE",
        "/rest/v1/proyecto_horas_trabajadas",
        params={"observaciones": f"like.{SEED_TAG}*"},
        prefer="return=minimal",
    )

    # Borrar presupuestos con tag
    s4, _ = http(
        "DELETE",
        "/rest/v1/proyecto_presupuesto",
        params={"observaciones": f"like.{SEED_TAG}*"},
        prefer="return=minimal",
    )

    print(f"  costos_imputados (obs): {s}")
    print(f"  costos_imputados (jus): {s2}")
    print(f"  horas:                  {s3}")
    print(f"  presupuesto:            {s4}")
    print("✓ Limpieza completa.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "sembrar"
    if cmd == "limpiar":
        cmd_limpiar()
    else:
        cmd_sembrar()
