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
    """Del comprobante de pago busca monto + fecha."""
    txt = extraer_pdf_texto(pdf_path)
    monto = None
    fecha = None
    # Monto: buscar el más grande encontrado (suele ser el total)
    montos = [float(m.replace(",", "")) for m in MONTO_RE.findall(txt)]
    if montos:
        monto = max(montos)
    # Fecha: dd/mm/yyyy o dd-MMM-yyyy
    m = re.search(r"(\d{2})[/-](\d{2})[/-](\d{4})", txt)
    if m:
        try:
            fecha = date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
        except ValueError:
            pass
    if not fecha:
        # Fallback: fecha de modificación del archivo
        try:
            ts = pdf_path.stat().st_mtime
            fecha = date.fromtimestamp(ts).isoformat()
        except Exception:
            pass
    return monto, fecha


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

            # Estrategia: 1 fila por acuse encontrado. Si hay 2 acuses
            # asumimos que hay 2 comprobantes asociados (en orden).
            for i, acuse in enumerate(acuses):
                tipo = clasificar_acuse(acuse.name)

                # Subir acuse al bucket
                url_acuse = (
                    f"{empresa_id}/{anio}/{mes_num:02d}/"
                    f"acuse_{i+1}_{acuse.name.replace(' ', '_')}"
                )
                with open(acuse, "rb") as f:
                    storage_upload("obligaciones-sat", url_acuse, f.read())

                # Asociar comprobante (mismo índice si existe)
                comp = comprobantes[i] if i < len(comprobantes) else None
                url_comp = None
                monto = None
                fecha_pago = None
                if comp:
                    url_comp = (
                        f"{empresa_id}/{anio}/{mes_num:02d}/"
                        f"pago_{i+1}_{comp.name.replace(' ', '_')}"
                    )
                    with open(comp, "rb") as f:
                        storage_upload("obligaciones-sat", url_comp, f.read())
                    monto, fecha_pago = extraer_monto_y_fecha_pago(comp)
                    pdfs_subidos += 1

                pdfs_subidos += 1

                # Estado
                estado = "pagada" if comp else "presentada"
                # En tiempo: fecha_pago <= venc
                if fecha_pago and fecha_pago > venc:
                    estado = "extemporanea"

                payload = {
                    "empresa_id": empresa_id,
                    "tipo": tipo,
                    "periodo_anio": anio,
                    "periodo_mes": mes_num,
                    "periodo_label": f"{mes_label} {anio}",
                    "fecha_vencimiento": venc,
                    "fecha_pago": fecha_pago,
                    "fecha_presentacion": fecha_pago,  # asumimos misma
                    "monto_pagado": monto,
                    "linea_captura": linea,
                    "url_acuse": url_acuse,
                    "url_comprobante": url_comp,
                    "estado": estado,
                    "observaciones": (
                        f"Importado desde {acuse.name}"
                        + (f" + {comp.name}" if comp else "")
                    ),
                }

                # Upsert por (empresa, tipo, anio, mes) — merge si ya existe
                s, resp = http(
                    "POST",
                    "/rest/v1/obligaciones_sat",
                    body=payload,
                    params={"on_conflict": "empresa_id,tipo,periodo_anio,periodo_mes"},
                    prefer="resolution=merge-duplicates,return=representation",
                )
                if s in (200, 201):
                    creadas += 1
                else:
                    errores.append(f"{alias} {anio}/{mes_label} ({tipo}): {s} — {str(resp)[:200]}")

            print(f"  ✓ {anio}/{mes_label}: {len(acuses)} acuses · linea={linea or '—'}")

    print(f"\n{'='*70}\nRESUMEN")
    print(f"  Creadas: {creadas}")
    print(f"  Actualizadas: {actualizadas}")
    print(f"  PDFs subidos: {pdfs_subidos}")
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
    else:
        print(f"Comando: {cmd}")


if __name__ == "__main__":
    main()
