# -*- coding: utf-8 -*-
"""
Sube los paquetes mensuales de estados financieros del despacho contable.

Estructura origen:
- D:\\CONTABILIDAD\\{empresa}\\INFORMACION FINANCIERA[ ]despacho\\{año}\\
  - {N}.Información financiera {MES} {AA}.zip   (ZIP con 13 PDFs)
  - {N}.Información financiera {MES} {AA}/      (carpeta con PDFs)
- D:\\CONTABILIDAD\\LIMSON\\INFORMACION FINANCIERA DESPACHO F\\{año}\\
  - similar

Detecta el mes/año del nombre y mapea cada PDF al tipo de documento estándar
(balance_general, estado_resultados, balanza, flujo_efectivo, anexos_ingresos,
anexos_egresos, conciliacion_iva, iva_trasladado, iva_acreditable, subsidio,
impuestos_por_pagar, bancos, polizas).

Sube cada PDF al bucket `estados-financieros` en path:
  {empresa_id}/{año}-{mes:02}/{tipo_doc}.pdf

Y crea/actualiza una fila en `estados_financieros_mensuales` con el dict
de documentos llenado.

Uso:
    python scripts/upload_estados_financieros.py
"""
import os
import re
import sys
import json
import unicodedata
import urllib.parse
import urllib.request
import urllib.error
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'D:\CONTABILIDAD'
SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)
BUCKET = 'estados-financieros'

EMPRESA_FOLDER_MAP = {
    'PSE': 'PSE',
    'IAE': 'CIAE',
    'IED': 'IED',
    'LIMSON': 'LIMSON',
}

MESES = {
    'ENE': 1, 'ENERO': 1, 'JAN': 1,
    'FEB': 2, 'FEBRERO': 2,
    'MAR': 3, 'MARZO': 3,
    'ABR': 4, 'ABRIL': 4, 'APR': 4,
    'MAY': 5, 'MAYO': 5,
    'JUN': 6, 'JUNIO': 6,
    'JUL': 7, 'JULIO': 7,
    'AGO': 8, 'AGOSTO': 8, 'AGOST': 8, 'AUG': 8,
    'SEP': 9, 'SEPT': 9, 'SEPTIEMBRE': 9,
    'OCT': 10, 'OCTUBRE': 10,
    'NOV': 11, 'NOVIEMBRE': 11,
    'DIC': 12, 'DICIEMBRE': 12, 'DEC': 12,
}

# Mapeo nombre PDF → tipo de documento (slug en BD)
DOC_TYPES = [
    ('balance_general', re.compile(r'1\.|posici[oó]n\s+financiera|balance\s+general', re.I)),
    ('estado_resultados', re.compile(r'2\.|estado\s+de\s+resultados', re.I)),
    ('balanza', re.compile(r'3\.|balanza\s+de\s+comprobaci[oó]n', re.I)),
    ('flujo_efectivo', re.compile(r'4\.|flujo\s+de\s+efectivo', re.I)),
    ('anexos_ingresos', re.compile(r'5\.|anexos.*ingresos|cat[aá]logo\s+ingresos', re.I)),
    ('anexos_egresos', re.compile(r'6\.|anexos.*egresos|cat[aá]logo\s+egresos', re.I)),
    ('conciliacion_iva', re.compile(r'7\.|conciliaci[oó]n\s+de\s+iva', re.I)),
    ('iva_trasladado', re.compile(r'8\.|iva\s+trasladado', re.I)),
    ('iva_acreditable', re.compile(r'9\.|iva\s+acreditable', re.I)),
    ('subsidio', re.compile(r'10\.|subsidio', re.I)),
    ('impuestos_por_pagar', re.compile(r'11\.|impuesto[s]?\s+por\s+pagar', re.I)),
    ('bancos', re.compile(r'12\.|movimientos.*cat[aá]logo|bancos', re.I)),
    ('polizas', re.compile(r'13\.|diarios|p[oó]lizas', re.I)),
]


def slugify_filename(name):
    nfkd = unicodedata.normalize('NFKD', name)
    s = ''.join(c for c in nfkd if not unicodedata.combining(c))
    s = s.replace('ñ', 'n').replace('Ñ', 'N')
    return s


def http(method, path, body=None, headers=None):
    url = SUPABASE_URL + path
    h = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    if headers:
        h.update(headers)
    data = None
    if body is not None:
        data = (
            body if isinstance(body, (bytes, bytearray))
            else json.dumps(body).encode('utf-8')
        )
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode('utf-8')
            return resp.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode('utf-8')
        return e.code, text


def upload(path_in_bucket, raw_bytes):
    encoded = urllib.parse.quote(path_in_bucket, safe='/')
    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{encoded}'
    req = urllib.request.Request(
        url, data=raw_bytes, method='POST',
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'apikey': SERVICE_KEY,
            'Content-Type': 'application/pdf',
            'x-upsert': 'true',
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def detect_doc_type(filename):
    base = os.path.basename(filename).upper()
    for slug, pattern in DOC_TYPES:
        if pattern.search(filename):
            return slug
    return None


def extract_periodo_from_name(name):
    """Extrae (año, mes) del nombre del archivo/folder/zip.
    Ej:
      "11.Información financiera NOV 25.zip"
      "Informacion Financiera  MARZO 26 INTELIGENCIA.zip"
      "Informacion financiera  Agosto 25.zip"
      "08. Información Financiera Agosto 2025 Limson.zip"
    """
    n = slugify_filename(name).upper()
    # Año
    año = None
    m = re.search(r'(\b20\d{2}\b)', n)
    if m:
        año = int(m.group(1))
    else:
        m = re.search(r'\b(\d{2})\b(?!\d)', n)
        if m:
            yy = int(m.group(1))
            if yy >= 20:
                año = 2000 + yy
            else:
                año = 2000 + yy
    # Mes — buscar por nombres
    mes = None
    for kw, num in sorted(MESES.items(), key=lambda x: -len(x[0])):
        if re.search(r'\b' + kw + r'\b', n):
            mes = num
            break
    return año, mes


def collect_paquete(empresa_id, año, mes, archivos_bytes):
    """archivos_bytes = list of (filename_orig, bytes)
    Sube cada PDF y devuelve dict {tipo_doc: path}."""
    documentos = {}
    total_size = 0
    base_path = f'{empresa_id}/{año}-{mes:02d}'

    for filename, content in archivos_bytes:
        if not filename.lower().endswith('.pdf'):
            continue
        total_size += len(content)
        tipo = detect_doc_type(filename) or 'otro_' + slugify_filename(
            os.path.splitext(os.path.basename(filename))[0]
        ).lower().replace(' ', '_')[:40]
        # Sanitize
        safe = re.sub(r'[^a-zA-Z0-9_.-]', '_', tipo)
        bucket_path = f'{base_path}/{safe}.pdf'
        # Si ya hay uno con el mismo tipo, sufija
        if tipo in documentos:
            i = 2
            while f'{tipo}_{i}' in documentos:
                i += 1
            bucket_path = f'{base_path}/{safe}_{i}.pdf'
            tipo = f'{tipo}_{i}'
        code = upload(bucket_path, content)
        if code in (200, 201):
            documentos[tipo] = bucket_path
    return documentos, total_size


def upsert_efm(empresa_id, año, mes, documentos, total_size, firmados=False):
    """Upsert con merge-duplicates por (empresa_id, anio, mes)."""
    estandar = {'balance_general', 'estado_resultados', 'balanza', 'flujo_efectivo',
                'anexos_ingresos', 'anexos_egresos', 'conciliacion_iva',
                'iva_trasladado', 'iva_acreditable', 'subsidio',
                'impuestos_por_pagar', 'bancos', 'polizas'}

    # Si la fila ya existe, hacer merge de documentos en lugar de pisar
    code, existing = http(
        'GET',
        f'/rest/v1/estados_financieros_mensuales?empresa_id=eq.{empresa_id}&anio=eq.{año}&mes=eq.{mes}&select=id,documentos,firmados',
    )
    documentos_finales = dict(documentos)
    if isinstance(existing, list) and existing:
        prev_docs = existing[0].get('documentos') or {}
        # Merge: priorizar lo nuevo pero conservar lo anterior si no está
        merged = dict(prev_docs)
        merged.update(documentos)
        documentos_finales = merged
        firmados = firmados or existing[0].get('firmados', False)

    estandar_presentes = sum(1 for k in documentos_finales if k in estandar)
    paquete_completo = estandar_presentes >= 13

    payload = {
        'empresa_id': empresa_id,
        'anio': año,
        'mes': mes,
        'documentos': documentos_finales,
        'num_documentos': len(documentos_finales),
        'total_size_bytes': total_size,
        'paquete_completo': paquete_completo,
        'firmados': firmados,
    }

    if isinstance(existing, list) and existing:
        # PATCH si ya existe
        row_id = existing[0]['id']
        code, body = http(
            'PATCH',
            f'/rest/v1/estados_financieros_mensuales?id=eq.{row_id}',
            payload,
            headers={'Prefer': 'return=representation'},
        )
        # Devolver 200/204 como éxito
        if code == 204:
            return 200, [{'id': row_id}]
        return code, body
    else:
        # POST nuevo
        code, body = http(
            'POST',
            '/rest/v1/estados_financieros_mensuales',
            payload,
            headers={'Prefer': 'return=representation'},
        )
        return code, body


def main():
    code, empresas = http('GET', '/rest/v1/empresas?select=id,codigo')
    codigo_to_empresa = {e['codigo']: e for e in empresas}
    print(f'Empresas: {[e["codigo"] for e in empresas]}', flush=True)

    paquetes_subidos = 0
    pdfs_subidos = 0
    sin_periodo = 0
    errores = 0

    for dirpath, dirs, files in os.walk(ROOT):
        rel = os.path.relpath(dirpath, ROOT)
        if rel == '.':
            continue
        parts = rel.split(os.sep)
        emp_folder = parts[0].upper()
        emp_codigo = EMPRESA_FOLDER_MAP.get(emp_folder)
        if not emp_codigo:
            continue

        # Solo carpetas relacionadas al despacho
        full_rel = '/'.join(parts).upper()
        if 'INFORMACION FINANCIERA' not in full_rel:
            continue
        if 'IMSS' in full_rel:
            continue
        if 'BALANZAS' in full_rel.split('/')[-1]:
            continue
        if 'NO DEDUCIBLES' in full_rel:
            continue
        # Ignorar carpetas de respaldos contpaq y similares (no son paquetes mensuales)
        if 'RESPALDO' in full_rel or 'CONTPAQ' in full_rel:
            continue
        if 'HOJA DE TRABAJO' in full_rel:
            continue

        empresa = codigo_to_empresa.get(emp_codigo)
        if not empresa:
            continue

        firmados = 'FIRMAD' in full_rel

        # Caso 1: la carpeta misma es el paquete del mes (tiene PDFs adentro)
        pdf_files = [f for f in files if f.lower().endswith('.pdf')]
        zip_files = [f for f in files if f.lower().endswith('.zip')]

        # Si la última parte del path tiene "MES + año", asumimos que es paquete mensual
        leaf = parts[-1]
        año_l, mes_l = extract_periodo_from_name(leaf)

        if pdf_files and año_l and mes_l and 2020 <= año_l <= 2099:
            archivos = []
            for f in pdf_files:
                full = os.path.join(dirpath, f)
                try:
                    with open(full, 'rb') as fh:
                        archivos.append((f, fh.read()))
                except Exception:
                    errores += 1
            if archivos:
                docs, sz = collect_paquete(empresa['id'], año_l, mes_l, archivos)
                pdfs_subidos += len(docs)
                code, body = upsert_efm(empresa['id'], año_l, mes_l, docs, sz, firmados)
                if code in (200, 201):
                    paquetes_subidos += 1
                    print(
                        f'  ✓ {emp_codigo} {año_l}-{mes_l:02d} ({len(docs)} pdfs, {firmados=}) — paquete subido',
                        flush=True,
                    )
                else:
                    errores += 1
                    print(f'  ✗ Upsert {emp_codigo} {año_l}-{mes_l:02d}: {code} {str(body)[:200]}', flush=True)

        # Caso 2: ZIPs (cada zip es un paquete mensual)
        for zf in zip_files:
            año_z, mes_z = extract_periodo_from_name(zf)
            if not año_z or not mes_z:
                # Probar con el nombre del folder padre
                año_z, mes_z = año_l, mes_l
            if not año_z or not mes_z:
                sin_periodo += 1
                continue
            # Filtrar años fuera de rango (2020-2099)
            if not (2020 <= año_z <= 2099):
                sin_periodo += 1
                continue

            zip_path = os.path.join(dirpath, zf)
            try:
                with zipfile.ZipFile(zip_path) as zip_obj:
                    archivos = []
                    for member in zip_obj.namelist():
                        if not member.lower().endswith('.pdf'):
                            continue
                        try:
                            data = zip_obj.read(member)
                            archivos.append((os.path.basename(member), data))
                        except Exception:
                            pass
                    if archivos:
                        docs, sz = collect_paquete(empresa['id'], año_z, mes_z, archivos)
                        pdfs_subidos += len(docs)
                        code, body = upsert_efm(
                            empresa['id'], año_z, mes_z, docs, sz, firmados
                        )
                        if code in (200, 201):
                            paquetes_subidos += 1
                            print(
                                f'  ✓ {emp_codigo} {año_z}-{mes_z:02d} ZIP ({len(docs)} pdfs)',
                                flush=True,
                            )
                        else:
                            errores += 1
                            print(f'  ✗ ZIP upsert: {code} {str(body)[:200]}', flush=True)
            except zipfile.BadZipFile:
                errores += 1

    print(f'\n=== RESUMEN ===', flush=True)
    print(f'Paquetes mensuales subidos: {paquetes_subidos}', flush=True)
    print(f'PDFs totales subidos      : {pdfs_subidos}', flush=True)
    print(f'Sin periodo identificable : {sin_periodo}', flush=True)
    print(f'Errores                   : {errores}', flush=True)


if __name__ == '__main__':
    main()
