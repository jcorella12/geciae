# -*- coding: utf-8 -*-
"""
Importador masivo de XMLs de nómina CFDI 4.0 → ERP GECIAE.

Recorre carpetas de IAE / PSE / LIMSON, parsea cada XML, detecta empleados
nuevos por CURP, y opcionalmente:
  1. Da de alta empleados nuevos
  2. Sube XMLs al bucket Storage 'nomina-xmls'
  3. Crea registros en nomina_recibos + nomina_conceptos
  4. Crea un nomina_uploads por lote (uno por empresa)

Uso:
  python scripts/import_nomina_xmls.py inventario        # solo reporta
  python scripts/import_nomina_xmls.py importar          # ejecuta carga
  python scripts/import_nomina_xmls.py importar --solo IAE   # filtra empresa
  python scripts/import_nomina_xmls.py importar --crear-empleados   # ALTA empleados nuevos también
"""

import os
import sys
import re
import json
import urllib.request
import urllib.error
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

SUPABASE_URL = "https://dtmcqjtqykbkapzebbik.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6"
    "MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99"
    "Soa654OVbO1hwY"
)

EMPRESAS_CONFIG = {
    "IAE": {
        "codigo_bd": "CIAE",
        "carpeta": r"D:\CONTABILIDAD\IAE\NOMINA-IMSS\NOMINA TIMBRADA",
    },
    "PSE": {
        "codigo_bd": "PSE",
        "carpeta": r"D:\CONTABILIDAD\PSE\NOMINA-IMSS",
    },
    "LIMSON": {
        "codigo_bd": "LIMSON",
        "carpeta": r"D:\CONTABILIDAD\LIMSON\NOMINA-IMSS",
    },
}

PERIODICIDAD_MAP = {
    "01": "diaria",
    "02": "semanal",
    "03": "catorcenal",
    "04": "quincenal",
    "05": "mensual",
    "10": "unica",
}
TIPO_NOMINA_MAP = {"O": "ordinario", "E": "extraordinario"}

# Categorías permitidas en empleados (ENUM categoria_personal: planta/por_obra/repse)
CATEGORIA_DEFAULT = "planta"


def http(method, path, body=None, params=None):
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    url = SUPABASE_URL + path
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode("utf-8")
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, body
    except Exception as e:
        return 0, str(e)


def storage_upload(bucket, path, content_bytes, content_type="application/xml"):
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{urllib.parse.quote(path)}"
    req = urllib.request.Request(url, data=content_bytes, method="POST", headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


# ===== Parser XML =====

NS_PATTERN = re.compile(r"\{[^}]+\}")


def stripns(tag):
    return NS_PATTERN.sub("", tag)


def find_child(elem, name):
    for c in elem:
        if stripns(c.tag) == name:
            return c
    return None


def find_all(elem, name):
    return [c for c in elem if stripns(c.tag) == name]


def descendant(elem, *path):
    cur = elem
    for name in path:
        if cur is None:
            return None
        cur = find_child(cur, name)
    return cur


def parse_xml(xml_path):
    """Devuelve dict con datos del recibo o None si no es CFDI nómina válido."""
    try:
        tree = ET.parse(xml_path)
    except ET.ParseError:
        return {"error": "XML mal formado"}

    root = tree.getroot()
    if stripns(root.tag) != "Comprobante":
        return {"error": "No es Comprobante"}

    tipo_comp = root.attrib.get("TipoDeComprobante")
    if tipo_comp != "N":
        return {"error": f"Tipo {tipo_comp} (no es nómina)"}

    emisor = find_child(root, "Emisor")
    receptor = find_child(root, "Receptor")
    complemento = find_child(root, "Complemento")
    if complemento is None:
        return {"error": "Sin Complemento"}

    # TimbreFiscal
    tfd = None
    for c in complemento:
        if stripns(c.tag) == "TimbreFiscalDigital":
            tfd = c
            break
    # Si TFD está dentro de algún sub-nodo
    if tfd is None:
        for c in complemento.iter():
            if stripns(c.tag) == "TimbreFiscalDigital":
                tfd = c
                break

    # Nomina
    nomina = None
    for c in complemento:
        if stripns(c.tag) == "Nomina":
            nomina = c
            break

    if nomina is None or tfd is None:
        return {"error": "Sin Nomina o sin TimbreFiscal"}

    uuid_cfdi = tfd.attrib.get("UUID")
    if not uuid_cfdi:
        return {"error": "Sin UUID"}

    fecha_pago = nomina.attrib.get("FechaPago")
    fecha_inicial = nomina.attrib.get("FechaInicialPago")
    fecha_final = nomina.attrib.get("FechaFinalPago")
    tipo_n = nomina.attrib.get("TipoNomina", "O")
    num_dias = nomina.attrib.get("NumDiasPagados")

    receptor_n = find_child(nomina, "Receptor")
    if receptor_n is None:
        return {"error": "Sin Receptor de Nomina"}

    curp = receptor_n.attrib.get("Curp")
    if not curp:
        return {"error": "Sin CURP"}

    nss = receptor_n.attrib.get("NumSeguridadSocial")
    num_emp = receptor_n.attrib.get("NumEmpleado")
    departamento = receptor_n.attrib.get("Departamento")
    puesto = receptor_n.attrib.get("Puesto")
    fecha_inicio_rl = receptor_n.attrib.get("FechaInicioRelLaboral")
    sueldo_base = receptor_n.attrib.get("SalarioBaseCotApor")
    sdi = receptor_n.attrib.get("SalarioDiarioIntegrado")
    periodicidad_code = receptor_n.attrib.get("PeriodicidadPago")

    # Conceptos
    conceptos = []
    percep_node = find_child(nomina, "Percepciones")
    deduc_node = find_child(nomina, "Deducciones")
    otros_node = find_child(nomina, "OtrosPagos")

    if percep_node is not None:
        for p in find_all(percep_node, "Percepcion"):
            conceptos.append({
                "tipo": "percepcion",
                "clave_sat": p.attrib.get("TipoPercepcion", ""),
                "tipo_clave": p.attrib.get("Clave"),
                "concepto": p.attrib.get("Concepto", ""),
                "importe_gravado": float(p.attrib.get("ImporteGravado", 0) or 0),
                "importe_exento": float(p.attrib.get("ImporteExento", 0) or 0),
                "importe_total": float(p.attrib.get("ImporteGravado", 0) or 0)
                + float(p.attrib.get("ImporteExento", 0) or 0),
            })

    if deduc_node is not None:
        for d in find_all(deduc_node, "Deduccion"):
            conceptos.append({
                "tipo": "deduccion",
                "clave_sat": d.attrib.get("TipoDeduccion", ""),
                "tipo_clave": d.attrib.get("Clave"),
                "concepto": d.attrib.get("Concepto", ""),
                "importe_gravado": 0,
                "importe_exento": 0,
                "importe_total": float(d.attrib.get("Importe", 0) or 0),
            })

    if otros_node is not None:
        for o in find_all(otros_node, "OtroPago"):
            conceptos.append({
                "tipo": "otro_pago",
                "clave_sat": o.attrib.get("TipoOtroPago", ""),
                "tipo_clave": o.attrib.get("Clave"),
                "concepto": o.attrib.get("Concepto", ""),
                "importe_gravado": 0,
                "importe_exento": 0,
                "importe_total": float(o.attrib.get("Importe", 0) or 0),
            })

    total_perc = 0
    total_ded = 0
    total_otros = 0
    if percep_node is not None:
        total_perc = float(percep_node.attrib.get("TotalGravado", 0) or 0) + float(
            percep_node.attrib.get("TotalExento", 0) or 0
        )
    if deduc_node is not None:
        total_ded = float(deduc_node.attrib.get("TotalImpuestosRetenidos", 0) or 0) + float(
            deduc_node.attrib.get("TotalOtrasDeducciones", 0) or 0
        )
    if otros_node is not None:
        total_otros = float(otros_node.attrib.get("TotalOtrosPagos", 0) or 0)

    total_neto = total_perc + total_otros - total_ded

    return {
        "uuid_cfdi": uuid_cfdi,
        "serie": root.attrib.get("Serie"),
        "folio": root.attrib.get("Folio"),
        "fecha_emision": root.attrib.get("Fecha"),
        "fecha_pago": fecha_pago,
        "fecha_inicial_pago": fecha_inicial,
        "fecha_final_pago": fecha_final,
        "num_dias_pagados": float(num_dias) if num_dias else None,
        "periodicidad": PERIODICIDAD_MAP.get(periodicidad_code) if periodicidad_code else None,
        "tipo": TIPO_NOMINA_MAP.get(tipo_n, "otro"),
        "rfc_emisor": (emisor.attrib.get("Rfc") if emisor is not None else None),
        "nombre_emisor": (emisor.attrib.get("Nombre") if emisor is not None else None),
        "rfc_receptor": (receptor.attrib.get("Rfc") if receptor is not None else None),
        "nombre_receptor": (receptor.attrib.get("Nombre") if receptor is not None else None),
        "curp": curp,
        "nss": nss,
        "numero_empleado": num_emp,
        "departamento": departamento,
        "puesto": puesto,
        "fecha_inicio_rel_laboral": fecha_inicio_rl,
        "sueldo_base_cotizacion": float(sueldo_base) if sueldo_base else None,
        "salario_diario_integrado": float(sdi) if sdi else None,
        "total_percepciones": total_perc,
        "total_deducciones": total_ded,
        "total_otros_pagos": total_otros,
        "total_neto": total_neto,
        "conceptos": conceptos,
    }


# ===== Operaciones BD =====

def obtener_empresa_id(codigo):
    s, data = http("GET", "/rest/v1/empresas", params={"codigo": f"eq.{codigo}", "select": "id"})
    if s == 200 and data:
        return data[0]["id"]
    return None


def obtener_empleados_por_curp():
    """Devuelve dict {curp: {id, empresa_id, ...}}"""
    s, data = http(
        "GET",
        "/rest/v1/empleados",
        params={"select": "id,empresa_id,curp,nombre_completo,numero_empleado", "limit": "5000"},
    )
    if s != 200:
        return {}
    return {e["curp"]: e for e in data if e.get("curp")}


def obtener_uuids_existentes():
    """UUIDs ya cargados (para evitar duplicados)."""
    s, data = http(
        "GET",
        "/rest/v1/nomina_recibos",
        params={"select": "uuid_cfdi", "limit": "10000"},
    )
    if s != 200:
        return set()
    return {r["uuid_cfdi"] for r in data}


def crear_empleado(empresa_id, datos_xml):
    """Crea empleado en BD usando datos del XML. Devuelve id o None.
    Retries con número auto-generado si choca con UNIQUE(empresa, numero).
    Si CURP duplicada, busca el empleado existente y lo devuelve.
    """
    nombre = datos_xml.get("nombre_receptor") or "(sin nombre)"

    def build(numero):
        return {
            "empresa_id": empresa_id,
            "numero_empleado": numero,
            "nombre_completo": nombre,
            "rfc": datos_xml.get("rfc_receptor"),
            "curp": datos_xml["curp"],
            "nss": datos_xml.get("nss"),
            "categoria": CATEGORIA_DEFAULT,
            "puesto": datos_xml.get("puesto") or "Por definir",
            "area": datos_xml.get("departamento"),
            "fecha_ingreso": datos_xml.get("fecha_inicio_rel_laboral")
            or datetime.now().strftime("%Y-%m-%d"),
            "salario_base": datos_xml.get("sueldo_base_cotizacion"),
            "activo": True,
            "observaciones": f"Creado automáticamente desde XML nómina (UUID {datos_xml['uuid_cfdi']}).",
        }

    # Intento 1: número del XML
    numero = datos_xml.get("numero_empleado") or f"AUTO-{datos_xml['curp'][-6:]}"
    s, data = http("POST", "/rest/v1/empleados", body=build(numero))
    if s in (200, 201) and data and isinstance(data, list):
        return data[0]["id"]

    msg = str(data) if data else ""
    # Conflicto por CURP: buscar y devolver existente
    if "empleados_curp_key" in msg:
        s2, d2 = http(
            "GET", "/rest/v1/empleados",
            params={"curp": f"eq.{datos_xml['curp']}", "select": "id"},
        )
        if s2 == 200 and d2:
            return d2[0]["id"]

    # Conflicto por (empresa, numero): retry con sufijo CURP
    if "empleados_empresa_id_numero_empleado_key" in msg:
        numero2 = f"{numero}-{datos_xml['curp'][-4:]}"
        s3, d3 = http("POST", "/rest/v1/empleados", body=build(numero2))
        if s3 in (200, 201) and d3 and isinstance(d3, list):
            return d3[0]["id"]

    print(f"    ✗ Error creando empleado {datos_xml['curp']}: {s} {msg[:200]}")
    return None


def crear_upload(empresa_id, total_archivos, nombre):
    payload = {
        "empresa_id": empresa_id,
        "cargado_por": None,  # service role no tiene auth.uid()
        "archivo_original_nombre": nombre,
        "total_archivos": total_archivos,
        "estado": "procesando",
    }
    s, data = http("POST", "/rest/v1/nomina_uploads", body=payload)
    if s in (200, 201) and isinstance(data, list):
        return data[0]["id"]
    return None


def actualizar_upload(upload_id, procesados, fallidos, neto, errores, curps_nuevas, estado):
    body = {
        "archivos_procesados": procesados,
        "archivos_fallidos": fallidos,
        "empleados_nuevos_detectados": len(curps_nuevas),
        "total_neto_pagado": neto,
        "errores": errores,
        "curps_nuevas": curps_nuevas,
        "estado": estado,
        "procesado_at": datetime.now().isoformat(),
    }
    http(
        "PATCH",
        "/rest/v1/nomina_uploads",
        body=body,
        params={"id": f"eq.{upload_id}"},
    )


def insertar_recibo(empresa_id, empleado_id, datos, url_xml, upload_id):
    payload = {
        "empresa_id": empresa_id,
        "empleado_id": empleado_id,
        "uuid_cfdi": datos["uuid_cfdi"],
        "serie": datos.get("serie"),
        "folio": datos.get("folio"),
        "fecha_emision": datos.get("fecha_emision"),
        "fecha_pago": datos.get("fecha_pago"),
        "fecha_inicial_pago": datos.get("fecha_inicial_pago"),
        "fecha_final_pago": datos.get("fecha_final_pago"),
        "num_dias_pagados": datos.get("num_dias_pagados"),
        "periodicidad": datos.get("periodicidad"),
        "tipo": datos.get("tipo"),
        "total_percepciones": datos["total_percepciones"],
        "total_deducciones": datos["total_deducciones"],
        "total_otros_pagos": datos["total_otros_pagos"],
        "total_neto": datos["total_neto"],
        "sueldo_base_cotizacion": datos.get("sueldo_base_cotizacion"),
        "salario_diario_integrado": datos.get("salario_diario_integrado"),
        "url_xml": url_xml,
        "upload_id": upload_id,
    }
    s, data = http("POST", "/rest/v1/nomina_recibos", body=payload)
    if s in (200, 201) and isinstance(data, list):
        return data[0]["id"]
    return None


def insertar_conceptos(recibo_id, conceptos):
    if not conceptos:
        return
    rows = [
        {
            "recibo_id": recibo_id,
            "tipo": c["tipo"],
            "clave_sat": c["clave_sat"],
            "tipo_clave": c.get("tipo_clave"),
            "concepto": c["concepto"],
            "importe_gravado": c["importe_gravado"],
            "importe_exento": c["importe_exento"],
            "importe_total": c["importe_total"],
        }
        for c in conceptos
    ]
    http("POST", "/rest/v1/nomina_conceptos", body=rows)


# ===== Comandos =====

def recolectar_xmls(empresa_alias):
    cfg = EMPRESAS_CONFIG[empresa_alias]
    raiz = Path(cfg["carpeta"])
    if not raiz.exists():
        return []
    xmls = list(raiz.rglob("*.xml"))
    return xmls


def cmd_inventario(filtro=None):
    print("=" * 70)
    print("INVENTARIO DE XMLs DE NÓMINA")
    print("=" * 70)

    print("Cargando empleados existentes en BD...")
    empleados_bd = obtener_empleados_por_curp()
    print(f"  {len(empleados_bd)} empleados con CURP en BD\n")

    print("Cargando UUIDs ya importados en nomina_recibos...")
    uuids_existentes = obtener_uuids_existentes()
    print(f"  {len(uuids_existentes)} recibos previamente cargados\n")

    for alias, cfg in EMPRESAS_CONFIG.items():
        if filtro and alias != filtro:
            continue

        print(f"\n{'=' * 70}")
        print(f"Empresa: {alias} → {cfg['codigo_bd']}")
        print(f"Carpeta: {cfg['carpeta']}")
        print("=" * 70)

        xmls = recolectar_xmls(alias)
        print(f"  XMLs encontrados: {len(xmls)}")

        if not xmls:
            continue

        empresa_id = obtener_empresa_id(cfg["codigo_bd"])
        if not empresa_id:
            print(f"  ✗ Empresa {cfg['codigo_bd']} no encontrada en BD")
            continue

        empleados_empresa = {
            curp: e for curp, e in empleados_bd.items()
            if e["empresa_id"] == empresa_id
        }

        # Parsear todos los XML para detectar CURPs y datos
        curps_nuevas = {}  # curp → datos (último XML visto)
        curps_existentes = set()
        errores = 0
        recibos_nuevos = 0
        recibos_duplicados = 0

        for xml_path in xmls:
            datos = parse_xml(xml_path)
            if not datos or "error" in datos:
                errores += 1
                continue
            curp = datos["curp"]
            if curp in empleados_empresa:
                curps_existentes.add(curp)
            else:
                curps_nuevas[curp] = datos
            if datos["uuid_cfdi"] in uuids_existentes:
                recibos_duplicados += 1
            else:
                recibos_nuevos += 1

        print(f"  XMLs con error: {errores}")
        print(f"  Recibos NUEVOS (no en BD): {recibos_nuevos}")
        print(f"  Recibos ya cargados: {recibos_duplicados}")
        print(f"  Empleados existentes detectados: {len(curps_existentes)}")
        print(f"  Empleados NUEVOS detectados: {len(curps_nuevas)}")

        if curps_nuevas:
            print("\n  Lista de empleados nuevos:")
            for curp, datos in sorted(curps_nuevas.items()):
                nombre = datos.get("nombre_receptor", "(sin nombre)")
                puesto = datos.get("puesto", "?")
                num = datos.get("numero_empleado") or "—"
                sueldo = datos.get("sueldo_base_cotizacion") or 0
                print(f"    • {curp}  {nombre[:40]:<40}  {puesto[:20]:<20}  #{num}  ${sueldo:,.2f}")


def cmd_importar(filtro=None, crear_empleados=False):
    print("=" * 70)
    print("IMPORTACIÓN DE XMLs DE NÓMINA → BD")
    print("=" * 70)
    print(f"Crear empleados nuevos automáticamente: {'SÍ' if crear_empleados else 'NO'}")
    print()

    empleados_bd = obtener_empleados_por_curp()
    uuids_existentes = obtener_uuids_existentes()
    print(f"  Pre-loaded: {len(empleados_bd)} empleados, {len(uuids_existentes)} recibos\n")

    total_recibos_creados = 0
    total_empleados_creados = 0

    for alias, cfg in EMPRESAS_CONFIG.items():
        if filtro and alias != filtro:
            continue

        print(f"\n{'=' * 70}")
        print(f"Procesando: {alias} → {cfg['codigo_bd']}")
        print("=" * 70)

        xmls = recolectar_xmls(alias)
        if not xmls:
            print("  Sin XMLs.")
            continue

        empresa_id = obtener_empresa_id(cfg["codigo_bd"])
        if not empresa_id:
            print(f"  ✗ Empresa {cfg['codigo_bd']} no encontrada")
            continue

        empleados_empresa = {
            curp: e for curp, e in empleados_bd.items()
            if e["empresa_id"] == empresa_id
        }

        upload_id = crear_upload(empresa_id, len(xmls), f"Carga masiva {alias}")
        print(f"  Upload ID: {upload_id}")

        procesados = 0
        fallidos = 0
        empleados_creados = 0
        neto_total = 0
        curps_creadas = []
        errores_lista = []

        for i, xml_path in enumerate(xmls, 1):
            if i % 50 == 0:
                print(f"  Progreso: {i}/{len(xmls)}")

            datos = parse_xml(xml_path)
            if not datos or "error" in datos:
                fallidos += 1
                errores_lista.append({
                    "archivo": str(xml_path.name),
                    "error": datos.get("error", "?") if datos else "?",
                })
                continue

            curp = datos["curp"]

            # Skip si UUID ya cargado
            if datos["uuid_cfdi"] in uuids_existentes:
                continue

            # Empleado: existe o crear
            empleado_id = None
            if curp in empleados_empresa:
                empleado_id = empleados_empresa[curp]["id"]
            elif crear_empleados:
                empleado_id = crear_empleado(empresa_id, datos)
                if empleado_id:
                    empleados_empresa[curp] = {
                        "id": empleado_id,
                        "empresa_id": empresa_id,
                        "curp": curp,
                    }
                    empleados_creados += 1
                    curps_creadas.append(curp)

            if not empleado_id:
                fallidos += 1
                errores_lista.append({
                    "archivo": str(xml_path.name),
                    "curp": curp,
                    "error": "Empleado no existe (usa --crear-empleados)",
                })
                continue

            # Subir XML a Storage
            yyyy = datos["fecha_pago"][:4]
            mm = datos["fecha_pago"][5:7]
            url_xml = f"{empresa_id}/{yyyy}/{mm}/{curp}/{datos['uuid_cfdi']}.xml"
            with open(xml_path, "rb") as f:
                xml_bytes = f.read()
            storage_status = storage_upload("nomina-xmls", url_xml, xml_bytes)

            # Insertar recibo
            recibo_id = insertar_recibo(empresa_id, empleado_id, datos, url_xml, upload_id)
            if not recibo_id:
                fallidos += 1
                errores_lista.append({
                    "archivo": str(xml_path.name),
                    "error": "Error insertando recibo",
                })
                continue

            insertar_conceptos(recibo_id, datos["conceptos"])
            uuids_existentes.add(datos["uuid_cfdi"])
            procesados += 1
            neto_total += datos["total_neto"]

        estado_final = "completado" if fallidos == 0 else "completado_con_errores"
        actualizar_upload(
            upload_id, procesados, fallidos, neto_total,
            errores_lista[:100],  # truncar errores
            curps_creadas, estado_final,
        )

        total_recibos_creados += procesados
        total_empleados_creados += empleados_creados
        print(f"  ✓ {procesados} recibos cargados")
        print(f"  ✗ {fallidos} fallidos")
        print(f"  + {empleados_creados} empleados nuevos creados")
        print(f"  $ {neto_total:,.2f} neto pagado")

    print(f"\n{'=' * 70}")
    print("RESUMEN GLOBAL")
    print(f"  Recibos cargados: {total_recibos_creados}")
    print(f"  Empleados nuevos: {total_empleados_creados}")
    print("=" * 70)


def main():
    args = sys.argv[1:]
    if not args:
        print("Uso: python scripts/import_nomina_xmls.py [inventario|importar] [--solo CODIGO] [--crear-empleados]")
        sys.exit(1)

    cmd = args[0]
    filtro = None
    crear = False
    if "--solo" in args:
        i = args.index("--solo")
        if i + 1 < len(args):
            filtro = args[i + 1]
    if "--crear-empleados" in args:
        crear = True

    if cmd == "inventario":
        cmd_inventario(filtro)
    elif cmd == "importar":
        cmd_importar(filtro, crear)
    else:
        print(f"Comando desconocido: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
