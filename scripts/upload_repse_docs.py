# -*- coding: utf-8 -*-
"""
Sube todos los PDFs REPSE de D:\\CONTABILIDAD\\{empresa}\\REPSE\\... al bucket
estados-cuenta (reusamos), organizados por:
  {empresa_id}/REPSE/{año}/{categoria}/{filename}

Categorías detectadas en path:
- ICSOE
- SISUB
- CONTRATOS
- RENOVACION
- otros (default)
"""
import os
import re
import sys
import json
import urllib.parse
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'D:\CONTABILIDAD'
SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)
BUCKET = 'repse'

EMPRESA_FOLDER_MAP = {
    'PSE': 'PSE',
    'IAE': 'CIAE',
    'IED': 'IED',
    'LIMSON': 'LIMSON',
}


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


def ensure_bucket(name):
    code, _ = http(
        'POST',
        '/storage/v1/bucket',
        {'id': name, 'name': name, 'public': False},
    )
    return code in (200, 201, 409)


def upload(path_in_bucket, raw_bytes, ctype='application/pdf'):
    # URL-encode el path (preservando /)
    encoded = urllib.parse.quote(path_in_bucket, safe='/')
    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{encoded}'
    req = urllib.request.Request(
        url, data=raw_bytes, method='POST',
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'apikey': SERVICE_KEY,
            'Content-Type': ctype,
            'x-upsert': 'true',
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def detect_categoria(parts):
    P = [p.upper() for p in parts]
    for tok in ('ICSOE', 'SISUB', 'CONTRATOS', 'RENOVACION', 'RENOVACIÓN'):
        for p in P:
            if tok in p:
                return tok.replace('Ó', 'O')
    return 'OTROS'


def detect_año(parts, fname):
    for p in parts + [fname]:
        m = re.search(r'(20\d{2})', p)
        if m:
            return m.group(1)
    return 'sin-anio'


import unicodedata


def safe_name(name):
    """Normaliza nombre para path en bucket — strip acentos + chars problemáticos."""
    # Strip combining marks (acentos, tildes)
    nfkd = unicodedata.normalize('NFKD', name)
    name = ''.join(c for c in nfkd if not unicodedata.combining(c))
    # Reemplazar ñ → n
    name = name.replace('ñ', 'n').replace('Ñ', 'N')
    # Reemplazar caracteres ilegales para bucket
    name = re.sub(r'[\\/<>:"|?*]', '_', name)
    # Colapsar dobles espacios
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def main():
    code, empresas = http('GET', '/rest/v1/empresas?select=id,codigo')
    codigo_to_empresa = {e['codigo']: e for e in empresas}
    print(f'Empresas: {[e["codigo"] for e in empresas]}', flush=True)

    print(f'Asegurando bucket: {BUCKET}', flush=True)
    ensure_bucket(BUCKET)

    subidos = 0
    skipped = 0
    sin_empresa = 0
    por_categoria = {}
    por_empresa = {}
    errores = 0

    for dirpath, _, files in os.walk(ROOT):
        rel = os.path.relpath(dirpath, ROOT)
        parts = rel.split(os.sep) if rel != '.' else []
        if not parts:
            continue

        emp_folder = parts[0].upper()
        emp_codigo = EMPRESA_FOLDER_MAP.get(emp_folder)
        if not emp_codigo:
            continue

        # Solo carpetas REPSE
        if not any('REPSE' in p.upper() for p in parts):
            continue

        empresa = codigo_to_empresa.get(emp_codigo)
        if not empresa:
            sin_empresa += 1
            continue

        categoria = detect_categoria(parts)
        año = detect_año(parts, '')

        for f in files:
            if not f.lower().endswith('.pdf'):
                continue
            full = os.path.join(dirpath, f)
            try:
                with open(full, 'rb') as fh:
                    raw = fh.read()
            except Exception:
                errores += 1
                continue

            # Path bucket: {emp_id}/REPSE/{año}/{categoria}/{filename}
            sf = safe_name(f)
            sc = safe_name(categoria)
            sa = safe_name(año)
            bucket_path = f'{empresa["id"]}/{sa}/{sc}/{sf}'
            code = upload(bucket_path, raw)
            if code in (200, 201):
                subidos += 1
                por_categoria[categoria] = por_categoria.get(categoria, 0) + 1
                por_empresa[emp_codigo] = por_empresa.get(emp_codigo, 0) + 1
                if subidos % 25 == 0:
                    print(f'  Subidos: {subidos}', flush=True)
            else:
                skipped += 1
                if errores < 5:
                    print(f'  ERROR {code} en {bucket_path}', flush=True)

    print(f'\n=== RESUMEN ===', flush=True)
    print(f'PDFs subidos: {subidos}', flush=True)
    print(f'Skipped/err  : {skipped + errores}', flush=True)
    print(f'\nPor categoría:', flush=True)
    for k, v in sorted(por_categoria.items(), key=lambda x: -x[1]):
        print(f'  {v:5}  {k}', flush=True)
    print(f'\nPor empresa:', flush=True)
    for k, v in sorted(por_empresa.items(), key=lambda x: -x[1]):
        print(f'  {v:5}  {k}', flush=True)


if __name__ == '__main__':
    main()
