# -*- coding: utf-8 -*-
"""
Parche post-import: para todas las filas de cfdi con url_pdf IS NULL,
busca un PDF correspondiente en una carpeta (por UUID con o sin guiones)
y lo sube al bucket + actualiza la columna.

Uso:
    python scripts/patch_cfdi_pdfs.py <carpeta_con_pdfs>
"""
import os
import sys
import json
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)


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


def upload_pdf(path_in_bucket, raw_bytes):
    url = f'{SUPABASE_URL}/storage/v1/object/cfdi/{path_in_bucket}'
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


def index_pdfs_in_folder(folder):
    """Devuelve dict {uuid_compact: full_path, uuid_dashed: full_path} indexando
    todos los PDFs en folder + subfolders (1 nivel)."""
    idx = {}

    def add(name, full):
        if not name.lower().endswith('.pdf'):
            return
        base = name[:-4]  # sin .pdf
        # admite sufijos .1, .2 etc.
        if '.' in base:
            base = base.split('.')[0]
        idx[base.upper()] = full

    # Nivel raíz
    try:
        for f in os.listdir(folder):
            full = os.path.join(folder, f)
            if os.path.isfile(full):
                add(f, full)
            elif os.path.isdir(full):
                for f2 in os.listdir(full):
                    full2 = os.path.join(full, f2)
                    if os.path.isfile(full2):
                        add(f2, full2)
    except FileNotFoundError:
        pass
    return idx


def main(folder):
    print(f'Indexando PDFs en {folder}...', flush=True)
    pdf_idx = index_pdfs_in_folder(folder)
    print(f'  PDFs en folder: {len(pdf_idx)}', flush=True)

    print('\nBuscando rows de cfdi con url_pdf IS NULL...', flush=True)
    rows = []
    offset = 0
    page = 1000
    while True:
        code, body = http(
            'GET',
            '/rest/v1/cfdi?select=id,uuid_sat,empresa_id&url_pdf=is.null&order=created_at.asc',
            headers={'Range': f'{offset}-{offset+page-1}'},
        )
        if code not in (200, 206) or not isinstance(body, list) or not body:
            break
        rows.extend(body)
        offset += len(body)
        if len(body) < page:
            break
    print(f'  Filas sin url_pdf: {len(rows)}', flush=True)

    actualizadas = 0
    no_match = 0
    errores = 0
    for i, r in enumerate(rows):
        uuid = r['uuid_sat']
        if not uuid:
            no_match += 1
            continue
        compact = uuid.replace('-', '').upper()
        dashed = uuid.upper()
        pdf_path = pdf_idx.get(compact) or pdf_idx.get(dashed)
        if not pdf_path:
            no_match += 1
            continue

        try:
            with open(pdf_path, 'rb') as fh:
                pdf_bytes = fh.read()
        except Exception as e:
            errores += 1
            continue

        url_storage = f'{r["empresa_id"]}/{uuid}.pdf'
        code = upload_pdf(url_storage, pdf_bytes)
        if code not in (200, 201):
            errores += 1
            continue

        code2, _ = http(
            'PATCH',
            f'/rest/v1/cfdi?id=eq.{r["id"]}',
            {'url_pdf': url_storage},
            headers={'Prefer': 'return=minimal'},
        )
        if code2 == 204:
            actualizadas += 1
        else:
            errores += 1

        if (i + 1) % 100 == 0:
            print(
                f'  {i+1}/{len(rows)} (actualizadas={actualizadas}, '
                f'sin_pdf={no_match}, err={errores})',
                flush=True,
            )

    print(f'\n=== PARCHE COMPLETO ===', flush=True)
    print(f'Filas actualizadas con url_pdf : {actualizadas}', flush=True)
    print(f'Filas sin PDF en folder        : {no_match}', flush=True)
    print(f'Errores                        : {errores}', flush=True)


if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\usuario\AppData\Local\Temp\contabilidad_extract'
    main(folder)
