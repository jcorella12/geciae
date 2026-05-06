# -*- coding: utf-8 -*-
"""
Importador masivo de obligaciones SAT mensuales (declaración + acuse + pago).

Recorre las carpetas:
  D:\\CONTABILIDAD\\IAE\\P-PROVISIONAL IAE\\<anio>\\<mes>\\
  D:\\CONTABILIDAD\\PSE\\P PROVISIONAL PSE\\<anio>\\<mes>\\
  D:\\CONTABILIDAD\\IED\\P PROVISIONAL\\<anio>\\<mes>\\
  D:\\CONTABILIDAD\\LIMSON\\P PROVISIONAL LIMSON\\<anio>\\<mes>\\

Por cada mes encuentra:
  - PDFs "01. Acuse de Recibo SAT ..." → declaración aceptada
  - PDFs "DECLARACION ..." → declaración con línea de captura
  - PDFs "Comprobante de pago" / "Pago Referenciado" → comprobante banco

Crea filas en obligaciones_sat por cada acuse encontrado:
  - tipo: isr_retenciones si nombre incluye "Ret"; iva_mensual default
  - fecha_vencimiento: día 17 del mes siguiente
  - linea_captura: extraída del PDF de declaración (regex)
  - monto_pagado: del comprobante de pago
  - estado: 'pagada' si tiene comprobante, 'presentada' si solo acuse, 'pendiente' si nada
  - en_tiempo: fecha_pago <= fecha_vencimiento

Uso:
  python scripts/import_obligaciones_sat.py inventario
  python scripts/import_obligaciones_sat.py importar [--solo IAE|PSE|IED|LIMSON]
"""

import sys
import re
import json
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from datetime import date, datetime

sys.stdout.reconfigure(encoding="utf-8")

try:
    import pdfplumber  # type: ignore
except ImportError:
    print("Falta pdfplumber. Instala con: pip install pdfplumber")
    sys.exit(1)

SUPABASE_URL = "https://dtmcqjtqykbkapzebbik.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6"
    "MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99"
    "Soa654OVbO1hwY"
)

EMPRESAS = {
    "IAE": ("CIAE", r"D:\CONTABILIDAD\IAE\P-PROVISIONAL IAE"),
    "PSE": ("PSE", r"D:\CONTABILIDAD\PSE\P PROVISIONAL PSE"),
    "IED": ("IED", r"D:\CONTABILIDAD\IED\P PROVISIONAL"),
    "LIMSON": ("LIMSON", r"D:\CONTABILIDAD\LIMSON\P PROVISIONAL LIMSON"),
}

EMPRESAS_DIOT = {
    "IAE": ("CIAE", r"D:\CONTABILIDAD\IAE\DIOT\DIOT"),
    "PSE": ("PSE", r"D:\CONTABILIDAD\PSE\DIOT"),
    "IED": ("IED", r"D:\CONTABILIDAD\IED\DIOT"),
    "LIMSON": ("LIMSON", r"D:\CONTABILIDAD\LIMSON\DIOT"),
}

MESES = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "SEPT": 9, "OCTUBRE": 10,
    "NOVIEMBRE": 11, "NOV": 11, "DICIEMBRE": 12, "DIC": 12,
}

# SAT línea de captura: 20 chars alfanuméricos. Aparece en 2 formatos:
# 1) ACUSE — `Línea de Importe ... 0425 7TU0 6500 4792 7456 $...` (5 grupos)
# 2) DECLARACION — tabla con `<12 chars> <12 dígitos>...\n<8 chars>...`
LINEA_HEADER_RE = re.compile(r"L[ÍIí�]NEA\s*DE\s*CAPTURA", re.I)
# Acuse: 5 grupos de 4 chars alfanuméricos separados por espacios
LINEA_ACUSE_RE = re.compile(
    r"\b([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\b"
)
# Declaracion: línea partida (12 chars + continuación 8 chars en línea siguiente)
LINEA_DATA_RE = re.compile(
    r"^\s*([0-9A-Z]{8,16})\s+\d{12}.*?\n\s*([0-9A-Z]{4,12})\b",
    re.MULTILINE | re.DOTALL,
)
# Monto pagado en comprobante
MONTO_RE = re.compile(r"\$?\s*([\d,]+\.\d{2})")


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
        with urllib.request.urlopen(req) as r:
            t = r.read().decode("utf-8")
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def storage_upload(bucket, path, content_bytes, content_type="application/pdf"):
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


def extraer_pdf_texto(pdf_path):
    """Extrae todo el texto de un PDF para regex."""
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception:
        return ""


def extraer_linea_captura(pdfs):
    """Itera PDFs (acuses + declaraciones) hasta encontrar la línea de captura.

    Acuses: contienen `Línea de Captura: 0425 7TU0 6500 4792 7456`
    Declaraciones: tabla con la línea partida en 2 renglones.
    """
    for p in pdfs:
        txt = extraer_pdf_texto(p)
        # 1) Buscar formato acuse (5 grupos de 4)
        h = LINEA_HEADER_RE.search(txt)
        if h:
            snippet = txt[h.end():h.end() + 1000]
            m = LINEA_ACUSE_RE.search(snippet)
            if m:
                linea = "".join(m.groups())
                if len(linea) == 20:
                    return linea
            # 2) Buscar formato declaración (tabla)
            m = LINEA_DATA_RE.search(snippet)
            if m:
                linea = (m.group(1) + m.group(2)).strip()
                if 16 <= len(linea) <= 24:
                    return linea
    return None


def extraer_monto_y_fecha_pago(pdf_path):
    """Del comprobante de pago busca: monto, fecha, número de operación, línea.

    Formato típico de Pago Referenciado SAT:
      Línea de Captura: 0425 6BR4 8500 4729 6422
      Importe Pagado: $4,907
      Fecha y Hora de Pago: 15/09/2025 14:32 Hrs.
      Número de Operación: 122585724024
    """
    txt = extraer_pdf_texto(pdf_path)
    out = {
        "monto": None,
        "fecha": None,
        "numero_operacion": None,
        "linea": None,
    }

    # Importe Pagado: $4,907.00 (con o sin decimales)
    m = re.search(r"Importe\s*Pagado[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)", txt, re.I)
    if m:
        try:
            out["monto"] = float(m.group(1).replace(",", ""))
        except ValueError:
            pass

    # Fecha y Hora de Pago: 15/09/2025
    m = re.search(r"Fecha\s*y\s*Hora\s*de\s*Pago[:\s]*(\d{2})/(\d{2})/(\d{4})", txt, re.I)
    if m:
        try:
            out["fecha"] = date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
        except ValueError:
            pass

    # Número de Operación: 122585724024
    m = re.search(r"N[úu]mero\s*de\s*Operaci[óo]n[:\s]*(\d{8,15})", txt, re.I)
    if m:
        out["numero_operacion"] = m.group(1)

    # Línea de Captura del comprobante: 5 grupos de 4 alfanuméricos
    m = re.search(
        r"L[íi]nea\s*de\s*Captura[:\s]*([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})\s+([0-9A-Z]{4})",
        txt, re.I,
    )
    if m:
        out["linea"] = "".join(m.groups()).upper()

    # Fallback: si no hay monto, usar el más grande del PDF
    if out["monto"] is None:
        montos = [float(x.replace(",", "")) for x in MONTO_RE.findall(txt)]
        if montos:
            out["monto"] = max(montos)

    # Fallback fecha: mtime del archivo
    if not out["fecha"]:
        try:
            ts = pdf_path.stat().st_mtime
            out["fecha"] = date.fromtimestamp(ts).isoformat()
        except Exception:
            pass

    # Compatibilidad: legado regresaba (monto, fecha)
    return out["monto"], out["fecha"], out["numero_operacion"], out["linea"]


def extraer_monto_calculado_acuse(pdf_path):
    """Del acuse de la declaración suma todas las 'Cantidad a pagar'."""
    txt = extraer_pdf_texto(pdf_path)
    matches = re.findall(
        r"Cantidad\s*a\s*pagar[:\s]*([\d,]+(?:\.\d{2})?)",
        txt,
        re.I,
    )
    total = 0.0
    for m in matches:
        try:
            total += float(m.replace(",", ""))
        except ValueError:
            pass
    return total if matches else None


# ============================================================================
# Mapeo concepto SAT → tipo_obligacion_sat enum
# ============================================================================
# El acuse del SAT tiene típicamente 4 "Concepto de pago N: ...":
#   1. ISR personas morales            → isr_provisional
#   2. ISR retenciones por salarios    → isr_retenciones
#   3. Impuesto al Valor Agregado PM   → iva_mensual
#   4. IVA retenciones                 → iva_retenciones

CONCEPTO_TIPO_MAP = [
    # (regex case-insensitive sobre texto, tipo_enum)
    (re.compile(r"ISR\s*retenc(iones)?\s*por\s*salarios?", re.I), "isr_retenciones"),
    (re.compile(r"ISR\s*retenc(iones)?\s+(RESICO|honorarios|arrendamiento)", re.I), "isr_retenciones"),
    (re.compile(r"ISR\s*personas?\s*morales?", re.I), "isr_provisional"),
    (re.compile(r"ISR\s*provisional", re.I), "isr_provisional"),
    (re.compile(r"Impuesto\s*al\s*Valor\s*Agregado.*Personas?\s*morales?", re.I), "iva_mensual"),
    (re.compile(r"IVA\s*personas?\s*morales?", re.I), "iva_mensual"),
    (re.compile(r"IVA\s*retenc(iones)?", re.I), "iva_retenciones"),
]


def clasificar_concepto(texto_concepto: str) -> str | None:
    """Mapea el texto del concepto del acuse a tipo_obligacion_sat enum."""
    if not texto_concepto:
        return None
    # Normalizar — los PDFs vienen sin espacios a veces ("ISRpersonasmorales")
    norm = re.sub(r"([a-z])([A-Z])", r"\1 \2", texto_concepto)
    norm = norm.replace(".", " ").strip()
    for rx, tipo in CONCEPTO_TIPO_MAP:
        if rx.search(norm):
            return tipo
    return None


def extraer_conceptos_acuse(pdf_path):
    """Devuelve lista [{tipo, concepto_texto, cantidad_a_pagar}].

    Para cada bloque "Concepto de pago N: <nombre> ... Cantidad a pagar: <X>"
    extrae nombre + monto. Mapea el nombre a tipo_enum.

    Si no logra identificar el tipo, lo omite (no devuelve fila).
    """
    txt = extraer_pdf_texto(pdf_path)
    if not txt:
        return []

    # Patrón flexible: "Conceptodepago N : <nombre>" + ... + "Cantidadapagar: <X>"
    # Los PDFs vienen sin espacios — normalizamos primero.
    bloques = re.split(r"Concepto\s*de\s*pago\s*\d+\s*[:.]?\s*", txt, flags=re.I)
    resultado = []
    for bloque in bloques[1:]:  # primer split es el preámbulo
        # El nombre va hasta el siguiente "A cargo|Acargo|A favor|Afavor|Cantidad"
        # Permitimos whitespace (incluyendo \n) antes del marker.
        nombre_match = re.match(
            r"\s*([^\n]+?)\s*(?=A\s*cargo|Acargo|A\s*favor|Afavor|Cantidad)",
            bloque,
            re.I | re.DOTALL,
        )
        nombre = nombre_match.group(1).strip() if nombre_match else ""

        cant_match = re.search(
            r"Cantidad\s*a\s*pagar[:\s]*([\d,]+(?:\.\d{2})?)",
            bloque,
            re.I,
        )
        if not cant_match:
            continue
        try:
            cantidad = float(cant_match.group(1).replace(",", ""))
        except ValueError:
            continue

        tipo = clasificar_concepto(nombre)
        resultado.append(
            {
                "tipo": tipo,
                "concepto_texto": nombre,
                "cantidad_a_pagar": cantidad,
            }
        )
    return resultado


def fecha_vencimiento(anio, mes):
    """Día 17 del mes siguiente al periodo (regla común SAT mensual)."""
    if mes == 12:
        return date(anio + 1, 1, 17).isoformat()
    return date(anio, mes + 1, 17).isoformat()


def clasificar_acuse(filename):
    """Por nombre del PDF determina el tipo de obligación SAT."""
    n = filename.upper()
    if "RET ISR" in n or "RET. ISR" in n or "RETENC" in n or "RESICO" in n:
        return "isr_retenciones"
    # El acuse general suele cubrir ISR provisional + IVA. Lo clasificamos
    # como iva_mensual (es el "principal" del periodo).
    return "iva_mensual"


def obtener_empresa_id(codigo):
    s, data = http(
        "GET",
        "/rest/v1/empresas",
        params={"codigo": f"eq.{codigo}", "select": "id"},
    )
    if s == 200 and data:
        return data[0]["id"]
    return None


def recolectar_meses(carpeta_base):
    """Devuelve lista de (anio, mes_num, mes_label, path)."""
    raiz = Path(carpeta_base)
    if not raiz.exists():
        return []
    items = []
    for anio_dir in raiz.iterdir():
        if not anio_dir.is_dir() or not anio_dir.name.isdigit():
            continue
        anio = int(anio_dir.name)
        for mes_dir in anio_dir.iterdir():
            if not mes_dir.is_dir():
                continue
            nombre_mes = mes_dir.name.upper().replace(".", "").strip()
            # Toma primera palabra y mapea
            mes_key = nombre_mes.split()[0]
            if mes_key not in MESES:
                continue
            items.append((anio, MESES[mes_key], mes_dir.name, mes_dir))
    return items


def agrupar_pdfs(carpeta):
    """Devuelve diccionario: 'acuses', 'declaraciones', 'comprobantes'."""
    acuses = []
    declaraciones = []
    comprobantes = []
    for f in carpeta.iterdir():
        if not f.is_file() or f.suffix.lower() != ".pdf":
            continue
        n = f.name.upper()
        if "ACUSE" in n:
            acuses.append(f)
        elif "DECLARACION" in n or "DECLARACIÓN" in n:
            declaraciones.append(f)
        elif "COMPROBANTE" in n or "PAGO REFERENCIADO" in n or "MONEX" in n:
            comprobantes.append(f)
    return {"acuses": acuses, "declaraciones": declaraciones, "comprobantes": comprobantes}


# ============================================================================

def cmd_inventario(filtro=None):
    print("=" * 70)
    print("INVENTARIO OBLIGACIONES SAT")
    print("=" * 70)
    total_acuses = 0
    total_pagos = 0
    for alias, (codigo_bd, carpeta) in EMPRESAS.items():
        if filtro and alias != filtro:
            continue
        meses = recolectar_meses(carpeta)
        print(f"\n{alias} → {codigo_bd}: {len(meses)} meses")
        for anio, mes_num, mes_label, mes_dir in meses:
            grupos = agrupar_pdfs(mes_dir)
            a = len(grupos["acuses"])
            d = len(grupos["declaraciones"])
            c = len(grupos["comprobantes"])
            print(f"  {anio}/{mes_label}  acuses={a}  decla={d}  pagos={c}")
            total_acuses += a
            total_pagos += c
    print(f"\nTotal acuses: {total_acuses}, pagos: {total_pagos}")


def cmd_importar(filtro=None):
    print("=" * 70)
    print("IMPORTACIÓN OBLIGACIONES SAT")
    print("=" * 70)

    # UUIDs por código
    empresa_ids = {}
    for alias, (codigo_bd, _) in EMPRESAS.items():
        empresa_ids[codigo_bd] = obtener_empresa_id(codigo_bd)
    print(f"Empresas: {empresa_ids}")

    creadas = 0
    actualizadas = 0
    pdfs_subidos = 0
    errores = []

    for alias, (codigo_bd, carpeta) in EMPRESAS.items():
        if filtro and alias != filtro:
            continue
        empresa_id = empresa_ids.get(codigo_bd)
        if not empresa_id:
            print(f"\n✗ Empresa {codigo_bd} no encontrada")
            continue

        meses = recolectar_meses(carpeta)
        print(f"\n{alias} ({codigo_bd}): {len(meses)} meses")

        for anio, mes_num, mes_label, mes_dir in meses:
            grupos = agrupar_pdfs(mes_dir)
            acuses = grupos["acuses"]
            declas = grupos["declaraciones"]
            comprobantes = grupos["comprobantes"]

            if not acuses:
                continue  # nada que cargar

            # Línea de captura: probar primero acuses (formato más legible)
            # luego declaraciones como fallback
            linea = extraer_linea_captura(acuses + declas)

            venc = fecha_vencimiento(anio, mes_num)

            # ESTRATEGIA NUEVA (2026-05): un acuse SAT contiene MÚLTIPLES
            # conceptos de pago (ISR PM, ISR ret, IVA PM, IVA ret). Creamos
            # una fila por concepto con su monto correcto. La línea de
            # captura del comprobante se asigna a TODAS (es una sola que
            # cubre el total). Si hay varios acuses para el mismo periodo,
            # mergeamos los conceptos (upsert por empresa+tipo+año+mes).

            # Reunir información del comprobante (si existe alguno)
            comp_principal = comprobantes[0] if comprobantes else None
            url_comp = None
            monto_total_pagado = None
            fecha_pago = None
            numero_op = None
            linea_comprobante = None
            if comp_principal:
                url_comp = (
                    f"{empresa_id}/{anio}/{mes_num:02d}/"
                    f"pago_{comp_principal.name.replace(' ', '_')}"
                )
                with open(comp_principal, "rb") as f:
                    storage_upload("obligaciones-sat", url_comp, f.read())
                (
                    monto_total_pagado,
                    fecha_pago,
                    numero_op,
                    linea_comprobante,
                ) = extraer_monto_y_fecha_pago(comp_principal)
                pdfs_subidos += 1

            linea_final = linea_comprobante or linea
            conceptos_creados: list[tuple[str, float]] = []

            # Recolectar todos los conceptos de todos los acuses con su URL
            # del acuse origen, después procesarlos ordenados:
            #   primero los con cantidad > 0 (montos reales)
            #   luego los con cantidad == 0 (no se sobreescribe lo real)
            todos_conceptos: list[dict] = []
            for i, acuse in enumerate(acuses):
                # Subir acuse
                url_acuse = (
                    f"{empresa_id}/{anio}/{mes_num:02d}/"
                    f"acuse_{i+1}_{acuse.name.replace(' ', '_')}"
                )
                with open(acuse, "rb") as f:
                    storage_upload("obligaciones-sat", url_acuse, f.read())
                pdfs_subidos += 1

                # Extraer conceptos del acuse
                conceptos = extraer_conceptos_acuse(acuse)

                # Si no se identificaron conceptos (acuse RET ISR sin
                # texto), usar fallback por nombre del archivo
                if not conceptos or all(c["tipo"] is None for c in conceptos):
                    tipo_fallback = clasificar_acuse(acuse.name)
                    monto_fallback = extraer_monto_calculado_acuse(acuse) or 0
                    conceptos = [
                        {
                            "tipo": tipo_fallback,
                            "concepto_texto": acuse.name,
                            "cantidad_a_pagar": monto_fallback,
                        }
                    ]

                # Acumular conceptos de este acuse
                for c in conceptos:
                    if not c["tipo"]:
                        continue
                    todos_conceptos.append(
                        {
                            "tipo": c["tipo"],
                            "cantidad": c["cantidad_a_pagar"],
                            "concepto_texto": c["concepto_texto"],
                            "acuse_name": acuse.name,
                            "url_acuse": url_acuse,
                        }
                    )

            # Si hay duplicados de tipo, conservar el de mayor cantidad
            # (un acuse general con concepto=0 no debe sobreescribir un
            # acuse específico con concepto>0).
            por_tipo: dict[str, dict] = {}
            for c in todos_conceptos:
                key = c["tipo"]
                if key not in por_tipo or c["cantidad"] > por_tipo[key]["cantidad"]:
                    por_tipo[key] = c

            # Asegurar que TODOS los tipos posibles del periodo se evalúen
            # — incluso los que no aparecen en el acuse — para que se
            # corrijan filas existentes (ej. iva_mensual=0 cuando antes
            # decía 128,649). Para cada tipo en el ciclo mensual (iva,
            # isr_prov, isr_ret, iva_ret) si no se procesó, forzamos un
            # registro con cantidad=0 para sobreescribir.
            tipos_mensuales = {"iva_mensual", "isr_provisional", "isr_retenciones", "iva_retenciones"}
            for t in tipos_mensuales:
                if t not in por_tipo and acuses:
                    por_tipo[t] = {
                        "tipo": t,
                        "cantidad": 0,
                        "concepto_texto": f"{t} (sin monto en acuse)",
                        "acuse_name": acuses[0].name,
                        "url_acuse": None,
                    }

            # Upsert ordenado: primero cantidad > 0, luego == 0
            conceptos_finales = sorted(
                por_tipo.values(), key=lambda c: -c["cantidad"]
            )

            for c in conceptos_finales:
                tipo = c["tipo"]
                cantidad = c["cantidad"]

                pagado = cantidad > 0 and comp_principal is not None
                monto_pagado_concepto = (
                    cantidad if pagado else (0 if cantidad == 0 else None)
                )

                if cantidad == 0:
                    estado = "no_aplica"
                elif pagado:
                    estado = (
                        "extemporanea"
                        if fecha_pago and fecha_pago > venc
                        else "pagada"
                    )
                else:
                    estado = "presentada"

                payload = {
                    "empresa_id": empresa_id,
                    "tipo": tipo,
                    "periodo_anio": anio,
                    "periodo_mes": mes_num,
                    "periodo_label": f"{mes_label} {anio}",
                    "fecha_vencimiento": venc,
                    "fecha_pago": fecha_pago if pagado else None,
                    "fecha_presentacion": fecha_pago,
                    "monto_calculado": cantidad,
                    "monto_pagado": monto_pagado_concepto,
                    "numero_operacion": numero_op if pagado else None,
                    "linea_captura": linea_final,
                    "url_acuse": c["url_acuse"],
                    "url_comprobante": url_comp if pagado else None,
                    "estado": estado,
                    "observaciones": (
                        f"{c['concepto_texto'] or 'Concepto'} — "
                        f"importado desde {c['acuse_name']}"
                    ),
                }

                s, resp = http(
                    "POST",
                    "/rest/v1/obligaciones_sat",
                    body=payload,
                    params={
                        "on_conflict": "empresa_id,tipo,periodo_anio,periodo_mes"
                    },
                    prefer="resolution=merge-duplicates,return=representation",
                )
                if s in (200, 201):
                    creadas += 1
                    conceptos_creados.append((tipo, cantidad))
                else:
                    errores.append(
                        f"{alias} {anio}/{mes_label} ({tipo}): {s} — {str(resp)[:200]}"
                    )

            resumen_tipos = ", ".join(
                f"{t}={int(m):,}" for t, m in conceptos_creados
            )
            print(
                f"  ✓ {anio}/{mes_label}: {len(conceptos_creados)} conceptos · {resumen_tipos}"
            )

    print(f"\n{'='*70}\nRESUMEN")
    print(f"  Creadas: {creadas}")
    print(f"  Actualizadas: {actualizadas}")
    print(f"  PDFs subidos: {pdfs_subidos}")
    print(f"  Errores: {len(errores)}")
    if errores:
        for e in errores[:20]:
            print(f"    {e}")


# ============================================================================
# DIOT — Declaración Informativa de Operaciones con Terceros
# ============================================================================

def parsear_diot_acuse(pdf_path):
    """Extrae datos del acuse DIOT: periodo, número operación, total operaciones, IVA pagado."""
    txt = extraer_pdf_texto(pdf_path)
    out = {
        "anio": None,
        "mes": None,
        "fecha_presentacion": None,
        "numero_operacion": None,
        "total_operaciones": None,
        "iva_pagado": None,
    }

    # Periodo y ejercicio
    m = re.search(r"Per[ií]odo\s*de\s*la\s*declaraci[óo]n[:\s]*(\w+)", txt, re.I)
    if m:
        nombre_mes = m.group(1).upper().strip()
        out["mes"] = MESES.get(nombre_mes)
    m = re.search(r"Ejercicio[:\s]*(\d{4})", txt, re.I)
    if m:
        out["anio"] = int(m.group(1))

    # Fecha y hora de presentación: dd/mm/yyyy
    m = re.search(r"Fecha\s*y\s*hora\s*de\s*presentaci[óo]n[:\s]*(\d{2})/(\d{2})/(\d{4})", txt, re.I)
    if m:
        try:
            out["fecha_presentacion"] = date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
        except ValueError:
            pass

    # Número de operación
    m = re.search(r"N[úu]mero\s*de\s*operaci[óo]n[:\s]*(\d{8,15})", txt, re.I)
    if m:
        out["numero_operacion"] = m.group(1)

    # Total de operaciones que relaciona
    m = re.search(r"Total\s*de\s*operaciones\s*que\s*relaciona\s+(\d+)", txt, re.I)
    if m:
        out["total_operaciones"] = int(m.group(1))

    # Total IVA pagado (Total del impuesto al valor agregado sin incluir importaciones)
    m = re.search(
        r"Total\s*del\s*impuesto\s*al\s*valor\s*agregado.*?IVA\s*pagado\s*\$?([\d,]+(?:\.\d{2})?)",
        txt, re.I | re.DOTALL,
    )
    if m:
        try:
            out["iva_pagado"] = float(m.group(1).replace(",", ""))
        except ValueError:
            pass

    return out


def recolectar_meses_diot(carpeta_base):
    """Mismo formato que recolectar_meses pero para carpetas DIOT."""
    raiz = Path(carpeta_base)
    if not raiz.exists():
        return []
    items = []
    for anio_dir in raiz.iterdir():
        if not anio_dir.is_dir() or not anio_dir.name.isdigit():
            continue
        anio = int(anio_dir.name)
        for mes_dir in anio_dir.iterdir():
            if not mes_dir.is_dir():
                continue
            # Aceptar "01. Enero", "Enero", "ENERO", "Abril", etc.
            nombre = mes_dir.name
            # Si empieza con dígito + ".", quitar
            mn = re.sub(r"^\d+\.\s*", "", nombre).strip().upper()
            mes_key = mn.split()[0] if mn else ""
            if mes_key not in MESES:
                continue
            items.append((anio, MESES[mes_key], mes_dir.name, mes_dir))
    return items


def cmd_importar_diot(filtro=None):
    print("=" * 70)
    print("IMPORTACIÓN DIOT")
    print("=" * 70)

    empresa_ids = {}
    for alias, (codigo_bd, _) in EMPRESAS_DIOT.items():
        empresa_ids[codigo_bd] = obtener_empresa_id(codigo_bd)

    creadas = 0
    pdfs = 0
    errores = []

    for alias, (codigo_bd, carpeta) in EMPRESAS_DIOT.items():
        if filtro and alias != filtro:
            continue
        empresa_id = empresa_ids.get(codigo_bd)
        if not empresa_id:
            print(f"\n✗ Empresa {codigo_bd} no encontrada")
            continue

        meses = recolectar_meses_diot(carpeta)
        print(f"\n{alias} ({codigo_bd}): {len(meses)} meses con DIOT")

        for anio, mes_num, mes_label, mes_dir in meses:
            # Buscar acuse PDF (preferir el que tiene "Acuse" o "Aceptacion")
            pdf_files = [f for f in mes_dir.iterdir() if f.is_file() and f.suffix.lower() == ".pdf"]
            if not pdf_files:
                continue
            # Prioridad: "Acuse de Recibo" / "Acuse" > "Declaracion" > otros
            acuses = [f for f in pdf_files if "ACUSE" in f.name.upper() and "ENVI" in f.name.upper()] or \
                     [f for f in pdf_files if "ACUSE" in f.name.upper()] or pdf_files[:1]
            acuse = acuses[0]

            datos = parsear_diot_acuse(acuse)
            # Usar lo extraído del PDF si está, si no usar la carpeta
            anio_final = datos["anio"] or anio
            mes_final = datos["mes"] or mes_num

            # Vencimiento DIOT: último día del mes siguiente al periodo
            if mes_final == 12:
                venc = date(anio_final + 1, 1, 31).isoformat()
            else:
                # Último día del mes siguiente: día 0 del mes+2
                from calendar import monthrange
                last = monthrange(anio_final, mes_final + 1)[1]
                venc = date(anio_final, mes_final + 1, last).isoformat()

            # Subir PDF
            url = (
                f"{empresa_id}/diot/{anio_final}/{mes_final:02d}/"
                f"{acuse.name.replace(' ', '_')}"
            )
            with open(acuse, "rb") as f:
                storage_upload("obligaciones-sat", url, f.read())
            pdfs += 1

            # Estado: presentada (DIOT no se paga)
            fecha_presentacion = datos["fecha_presentacion"]
            if fecha_presentacion and fecha_presentacion > venc:
                estado = "extemporanea"
            elif fecha_presentacion:
                estado = "presentada"
            else:
                estado = "presentada"  # asumir presentada si hay PDF

            obs_iva = (
                f"IVA pagado: ${datos['iva_pagado']:,.0f}" if datos["iva_pagado"] else ""
            )
            obs_ops = (
                f" · {datos['total_operaciones']} operaciones"
                if datos["total_operaciones"]
                else ""
            )

            payload = {
                "empresa_id": empresa_id,
                "tipo": "diot",
                "periodo_anio": anio_final,
                "periodo_mes": mes_final,
                "periodo_label": f"DIOT {mes_label} {anio_final}",
                "fecha_vencimiento": venc,
                "fecha_presentacion": fecha_presentacion,
                "monto_calculado": datos["iva_pagado"],
                "monto_pagado": None,  # DIOT no se paga
                "numero_operacion": datos["numero_operacion"],
                "url_acuse": url,
                "estado": estado,
                "observaciones": f"DIOT — {obs_iva}{obs_ops}",
            }

            s, resp = http(
                "POST",
                "/rest/v1/obligaciones_sat",
                body=payload,
                params={"on_conflict": "empresa_id,tipo,periodo_anio,periodo_mes"},
                prefer="resolution=merge-duplicates,return=representation",
            )
            if s in (200, 201):
                creadas += 1
                print(
                    f"  ✓ {anio_final}/{mes_label}: op={datos['numero_operacion']} "
                    f"· {datos['total_operaciones'] or '?'} ops "
                    f"· IVA ${datos['iva_pagado'] or 0:,.0f} · {estado}"
                )
            else:
                errores.append(f"{alias} {anio_final}/{mes_label}: {s} — {str(resp)[:200]}")

    print(f"\n{'='*70}\nRESUMEN DIOT")
    print(f"  Creadas: {creadas}")
    print(f"  PDFs subidos: {pdfs}")
    print(f"  Errores: {len(errores)}")
    if errores:
        for e in errores[:20]:
            print(f"    {e}")


def main():
    args = sys.argv[1:]
    if not args:
        print(
            "Uso: python scripts/import_obligaciones_sat.py [inventario|importar] [--solo IAE|PSE|IED|LIMSON]"
        )
        sys.exit(1)
    cmd = args[0]
    filtro = None
    if "--solo" in args:
        i = args.index("--solo")
        if i + 1 < len(args):
            filtro = args[i + 1]
    if cmd == "inventario":
        cmd_inventario(filtro)
    elif cmd == "importar":
        cmd_importar(filtro)
    elif cmd == "diot":
        cmd_importar_diot(filtro)
    else:
        print(f"Comando desconocido: {cmd}")
        print("Uso: inventario | importar | diot [--solo IAE|PSE|IED|LIMSON]")


if __name__ == "__main__":
    main()
