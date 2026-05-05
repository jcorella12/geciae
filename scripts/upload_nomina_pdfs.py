# -*- coding: utf-8 -*-
"""
Sube los PDFs de recibos de nómina al Storage y actualiza url_pdf en
nomina_recibos.

Para cada XML ya cargado en BD, busca el PDF con el mismo nombre base en
las carpetas de CONTABILIDAD/{IAE,PSE,LIMSON}/NOMINA-IMSS, lo sube al
bucket 'nomina-xmls' con la misma path que el XML pero extensión .pdf, y
actualiza url_pdf en BD.

Uso:
  python scripts/upload_nomina_pdfs.py            # sube todos los PDFs encontrados
  python scripts/upload_nomina_pdfs.py --solo IAE
"""

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

EMPRESAS = {
    "IAE": (r"D:\CONTABILIDAD\IAE\NOMINA-IMSS\NOMINA TIMBRADA", "CIAE"),
    "PSE": (r"D:\CONTABILIDAD\PSE\NOMINA-IMSS", "PSE"),
    "LIMSON": (r"D:\CONTABILIDAD\LIMSON\NOMINA-IMSS", "LIMSON"),
}


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
        return e.code, e.read().decode("utf-8")


def storage_upload(path, content_bytes, content_type):
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    url = f"{SUPABASE_URL}/storage/v1/object/nomina-xmls/{urllib.parse.quote(path)}"
    req = urllib.request.Request(url, data=content_bytes, method="POST", headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def main():
    args = sys.argv[1:]
    filtro = None
    if "--solo" in args:
        i = args.index("--solo")
        if i + 1 < len(args):
            filtro = args[i + 1]

    # Recolectar todos los XML+PDF pares por carpeta
    print("Indexando archivos PDF en CONTABILIDAD...")
    pdf_index = {}  # nombre_base (sin ext) → path
    for alias, (carpeta, _) in EMPRESAS.items():
        if filtro and alias != filtro:
            continue
        raiz = Path(carpeta)
        if not raiz.exists():
            continue
        for pdf_path in raiz.rglob("*.pdf"):
            # Solo PDFs que tienen un XML hermano con mismo nombre
            xml_hermano = pdf_path.with_suffix(".xml")
            if xml_hermano.exists():
                pdf_index[pdf_path.stem] = pdf_path
    print(f"  {len(pdf_index)} PDFs hermanos de XMLs encontrados\n")

    # Cargar recibos sin url_pdf
    print("Cargando recibos sin PDF en BD...")
    s, recibos = http(
        "GET",
        "/rest/v1/nomina_recibos",
        params={
            "select": "id,uuid_cfdi,url_xml,empresa_id",
            "url_pdf": "is.null",
            "limit": "5000",
        },
    )
    if s != 200 or not recibos:
        print(f"  Error o vacío: {s}")
        return
    print(f"  {len(recibos)} recibos sin PDF\n")

    actualizados = 0
    no_encontrados = 0

    for r in recibos:
        url_xml = r["url_xml"]
        # url_xml es algo como: empresa_id/yyyy/mm/CURP/UUID.xml
        # buscar PDF en disco que coincida con el UUID o el patrón nombre
        # El PDF en disco se llama igual que el XML: RE_6103_..._XXX.pdf
        # No tenemos el nombre original, pero podemos buscar por UUID
        # Como fallback: buscar PDFs que contengan el UUID en su nombre
        uuid_str = r["uuid_cfdi"]
        # Búsqueda por nombre base — los pdfs se llaman como RE_6103_...
        # El UUID NO está en el nombre del archivo en disco. Así que en su
        # lugar abrimos el XML correspondiente para obtener su nombre o
        # usamos otra estrategia.
        # Estrategia: los PDFs y XMLs se llaman igual (mismo nombre base).
        # En el storage el XML se renombró a UUID.xml. Pero localmente
        # tenemos el nombre original.
        # Necesitamos mapear localmente: leer el XML local + extraer UUID
        # → ya hicimos eso en import_nomina_xmls. Aquí mejor: buscamos el
        # XML en disco con UUID dentro (más lento) o asumimos que ya
        # subimos el XML original sin renombrar y matcheamos por path.
        #
        # Simplificación: buscamos en pdf_index los archivos cuyos XML
        # hermanos contienen el UUID. Pre-indexamos eso.
        pass

    # Repensar: para cada PDF en disco, leemos el XML hermano y extraemos
    # UUID → matcheamos contra recibos.
    print("Mapeando UUIDs de XMLs locales a PDFs...")
    import xml.etree.ElementTree as ET
    import re
    NS_PATTERN = re.compile(r"\{[^}]+\}")

    def extraer_uuid(xml_path):
        try:
            tree = ET.parse(xml_path)
        except Exception:
            return None
        for elem in tree.iter():
            if NS_PATTERN.sub("", elem.tag) == "TimbreFiscalDigital":
                return elem.attrib.get("UUID")
        return None

    uuid_to_pdf = {}
    for stem, pdf_path in pdf_index.items():
        xml_hermano = pdf_path.with_suffix(".xml")
        u = extraer_uuid(xml_hermano)
        if u:
            uuid_to_pdf[u] = pdf_path
    print(f"  {len(uuid_to_pdf)} UUIDs mapeados a PDFs locales\n")

    # Subir cada PDF
    recibos_por_uuid = {r["uuid_cfdi"]: r for r in recibos}
    for u, pdf_path in uuid_to_pdf.items():
        if u not in recibos_por_uuid:
            continue
        recibo = recibos_por_uuid[u]
        # Path destino: igual que url_xml pero con .pdf
        url_pdf = recibo["url_xml"].replace(".xml", ".pdf")
        with open(pdf_path, "rb") as f:
            data = f.read()
        st = storage_upload(url_pdf, data, "application/pdf")
        if st in (200, 201):
            # Actualizar BD
            http(
                "PATCH",
                "/rest/v1/nomina_recibos",
                body={"url_pdf": url_pdf},
                params={"id": f"eq.{recibo['id']}"},
            )
            actualizados += 1
            if actualizados % 50 == 0:
                print(f"  Subidos: {actualizados}")
        else:
            print(f"  ✗ Error subiendo {pdf_path.name}: {st}")

    no_encontrados = len(recibos) - actualizados
    print(f"\n✓ {actualizados} PDFs subidos y vinculados")
    print(f"  {no_encontrados} recibos sin PDF disponible localmente")


if __name__ == "__main__":
    main()
