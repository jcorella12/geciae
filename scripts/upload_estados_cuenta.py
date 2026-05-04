# -*- coding: utf-8 -*-
"""
Sube todos los estados de cuenta PDF de D:\\CONTABILIDAD al bucket estados-cuenta,
organizándolos por empresa/banco/año/mes.

Detecta:
- Empresa: por la primera carpeta dentro de CONTABILIDAD (PSE, IAE, IED, LIMSON, JCP)
  · IAE → empresa CIAE
- Banco: por el nombre del archivo
  · BANCOMER/BBVA → BBVA México
  · MONEX → Monex
  · SCOTIABANK/SCOTIA → Scotiabank
  · BANREGIO → Banregio
  · BANORTE → Banorte
  · KONFIO → Konfio (TDC)
- Año/Mes: del path o nombre

Uso:
    python scripts/upload_estados_cuenta.py
"""
import os
import re
import sys
import json
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

# Map carpeta CONTABILIDAD → empresa_codigo del ERP
EMPRESA_FOLDER_MAP = {
    'PSE': 'PSE',
    'IAE': 'CIAE',  # Inteligencia Aplicada Empresarial → CIAE en ERP
    'IED': 'IED',
    'LIMSON': 'LIMSON',
    # JCP = Joaquín Corella Puente (persona física, no empresa del grupo, skip)
}

MESES = {
    'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
    'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
    'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
    'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AGO': 8, 'SEP': 9, 'SEPT': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
}


def detect_bank(filename):
    f = filename.upper()
    if 'BANCOMER' in f or 'BBVA' in f:
        return 'BBVA'
    if 'MONEX' in f:
        return 'MONEX'
    if 'SCOTIABANK' in f or 'SCOTIA' in f:
        return 'SCOTIA'
    if 'BANREGIO' in f:
        return 'BANREGIO'
    if 'BANORTE' in f:
        return 'BANORTE'
    if 'KONFIO' in f:
        return 'KONFIO'
    return None


def detect_period(filename, path_parts):
    f = filename.upper()
    # Año
    año = None
    m = re.search(r'(20\d{2})', f)
    if m:
        año = int(m.group(1))
    else:
        # Buscar en el path
        for p in path_parts:
            mp = re.search(r'^(20\d{2})$', p)
            if mp:
                año = int(mp.group(1))
                break
    # Mes
    mes = None
    for nombre, num in MESES.items():
        if re.search(r'\b' + nombre + r'\b', f):
            mes = num
            break
    if mes is None:
        for p in path_parts:
            for nombre, num in MESES.items():
                if p.upper() == nombre:
                    mes = num
                    break
            if mes:
                break
    return año, mes


def detect_currency(filename):
    f = filename.upper()
    if 'DOLAR' in f or 'USD' in f or 'DLS' in f:
        return 'USD'
    return 'MXN'


def detect_subtipo(filename):
    """Identifica si es debito, crédito, dolares, pesos, etc."""
    f = filename.upper()
    parts = []
    if 'DOLAR' in f or 'USD' in f or 'DLS' in f:
        parts.append('USD')
    if 'DEBITO' in f or 'DÉBITO' in f:
        parts.append('debito')
    if 'CREDITO' in f or 'CRÉDITO' in f or 'KONFIO' in f:
        parts.append('credito')
    return '-'.join(parts) if parts else None


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
    url = f'{SUPABASE_URL}/storage/v1/object/estados-cuenta/{path_in_bucket}'
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


def main():
    code, empresas = http('GET', '/rest/v1/empresas?select=id,codigo,rfc')
    codigo_to_empresa = {e['codigo']: e for e in empresas}
    print(f'Empresas: {[e["codigo"] for e in empresas]}', flush=True)

    subidos = 0
    skipped = 0
    sin_empresa = 0
    sin_banco = 0
    sin_periodo = 0
    por_banco = {}
    por_empresa_banco = {}

    for dirpath, _, files in os.walk(ROOT):
        rel = os.path.relpath(dirpath, ROOT)
        parts = rel.split(os.sep)
        if len(parts) < 1:
            continue

        # Empresa folder = primer nivel
        emp_folder = parts[0].upper() if parts[0] else ''
        emp_codigo = EMPRESA_FOLDER_MAP.get(emp_folder)
        if not emp_codigo:
            # JCP, GRUPO CIAE, ALONSO, ANUAL 2025, ARCHIVO etc. — skip
            continue

        empresa = codigo_to_empresa.get(emp_codigo)
        if not empresa:
            continue

        # Solo procesar si está bajo /BANCO o /BANCOS
        if not any(p.upper() in ('BANCO', 'BANCOS') for p in parts):
            continue

        for f in files:
            if not f.lower().endswith('.pdf'):
                continue
            fu = f.upper()
            # Filtrar solo edocuentas — buscar EDO CUENTA o BANCO directamente
            es_edocta = (
                'EDO' in fu or 'ESTADO_DE_CUENTA' in fu or 'ESTADO DE CUENTA' in fu
                or 'EDOC' in fu
            )
            # Excluir reembolsos / comprobantes
            if any(k in fu for k in ('COMPROBANTE', 'REEMBOLSO', 'REINTEGRO', 'TRANSFER')):
                if 'EDO. CUENTA' not in fu and 'EDO CUENTA' not in fu:
                    continue
            if not es_edocta:
                # IED y LIMSON BANORTE usan otros nombres ("Enero2024.pdf")
                if emp_codigo in ('IED', 'LIMSON') and re.search(
                    r'(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE).*\.PDF$',
                    fu,
                ):
                    pass  # aceptar
                else:
                    continue

            banco = detect_bank(f)
            if not banco:
                # IED/LIMSON sin pista de banco en el nombre → asumir BANORTE
                if emp_codigo in ('IED', 'LIMSON') and 'BANORTE' in dirpath.upper():
                    banco = 'BANORTE'
                elif emp_codigo == 'IED':
                    banco = 'BANORTE'
                else:
                    sin_banco += 1
                    continue

            año, mes = detect_period(f, parts)
            if not año or not mes:
                sin_periodo += 1
                continue

            currency = detect_currency(f)
            sub = detect_subtipo(f) or currency

            full_path = os.path.join(dirpath, f)
            try:
                with open(full_path, 'rb') as fh:
                    raw = fh.read()
            except Exception:
                continue

            # Path en bucket: {empresa_id}/{banco}/{año}-{mes:02}-{sub}.pdf
            bucket_path = f'{empresa["id"]}/{banco}/{año}-{mes:02d}-{sub}.pdf'
            code = upload_pdf(bucket_path, raw)
            if code in (200, 201):
                subidos += 1
                por_banco[banco] = por_banco.get(banco, 0) + 1
                key = f'{emp_codigo}-{banco}'
                por_empresa_banco[key] = por_empresa_banco.get(key, 0) + 1
                if subidos % 25 == 0:
                    print(f'  Subidos: {subidos}', flush=True)
            else:
                skipped += 1

    print(f'\n=== RESUMEN ===', flush=True)
    print(f'PDFs subidos al bucket    : {subidos}', flush=True)
    print(f'Errores de subida         : {skipped}', flush=True)
    print(f'Sin banco identificado    : {sin_banco}', flush=True)
    print(f'Sin periodo identificado  : {sin_periodo}', flush=True)
    print(f'Sin empresa del grupo     : {sin_empresa}', flush=True)
    print(f'\nPor banco:', flush=True)
    for k, v in sorted(por_banco.items(), key=lambda x: -x[1]):
        print(f'  {v:5}  {k}', flush=True)
    print(f'\nPor empresa-banco:', flush=True)
    for k, v in sorted(por_empresa_banco.items(), key=lambda x: -x[1]):
        print(f'  {v:5}  {k}', flush=True)


if __name__ == '__main__':
    main()
