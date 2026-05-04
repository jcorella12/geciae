# -*- coding: utf-8 -*-
"""
Vincula los PDFs ya subidos al bucket estados-cuenta con su cuenta bancaria
correspondiente, creando filas en estados_cuenta_bancarios.

Lista todos los objetos del bucket, matching por empresa+banco con bancos_cuentas,
y para cada PDF crea una fila con periodo_inicio/fin (primer y último día del mes)
y saldo_final placeholder=0 (a llenar después con extracción IA).

Idempotente: si la fila ya existe (cuenta_id, periodo_inicio, periodo_fin, formato),
hace skip.
"""
import os
import sys
import json
import urllib.parse
import urllib.request
import urllib.error
from datetime import date

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)

BANCO_PATH_TO_REAL = {
    'BBVA': 'BBVA México',
    'MONEX': 'Monex',
    'SCOTIA': 'Scotiabank',
    'BANREGIO': 'Banregio',
    'BANORTE': 'Banorte',
    'KONFIO': 'Konfío',
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
        data = body if isinstance(body, (bytes, bytearray)) else json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode('utf-8')
            return resp.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode('utf-8')
        return e.code, text


def list_bucket_objects(bucket, prefix=''):
    """Lista objects en bucket. Devuelve list de paths."""
    objects = []
    offset = 0
    while True:
        body = {'prefix': prefix, 'limit': 100, 'offset': offset}
        code, data = http(
            'POST',
            f'/storage/v1/object/list/{bucket}',
            body,
        )
        if code != 200 or not isinstance(data, list) or not data:
            break
        for item in data:
            if item.get('id') is None and item.get('name'):
                # subfolder
                sub = list_bucket_objects(bucket, prefix + item['name'] + '/')
                objects.extend(sub)
            else:
                objects.append(prefix + item['name'])
        if len(data) < 100:
            break
        offset += len(data)
    return objects


def parse_path(path):
    """Espera formato {empresa_id}/{BANCO_KEY}/{año-mes}-{tipo}.pdf"""
    parts = path.split('/')
    if len(parts) < 3:
        return None
    empresa_id = parts[0]
    banco_key = parts[1]
    filename = parts[2]
    if not filename.lower().endswith('.pdf'):
        return None
    base = filename[:-4]
    # Formato: 2025-04-MXN.pdf o 2025-04-USD-debito.pdf
    bits = base.split('-')
    if len(bits) < 2:
        return None
    try:
        año = int(bits[0])
        mes = int(bits[1])
    except ValueError:
        return None
    tipo_extra = '-'.join(bits[2:]) if len(bits) > 2 else 'MXN'
    return {
        'empresa_id': empresa_id,
        'banco_key': banco_key,
        'año': año,
        'mes': mes,
        'tipo_extra': tipo_extra,
        'currency': 'USD' if 'USD' in tipo_extra.upper() else 'MXN',
    }


def main():
    code, cuentas = http(
        'GET',
        '/rest/v1/bancos_cuentas?select=id,empresa_id,banco,moneda,tipo,numero_cuenta',
    )
    print(f'Cuentas en BD: {len(cuentas)}', flush=True)

    # index por (empresa_id, banco_real, moneda)
    cuenta_index = {}
    for c in cuentas:
        key = (c['empresa_id'], c['banco'], c.get('moneda', 'MXN'))
        cuenta_index[key] = c['id']

    # también mapear por (empresa, banco) para fallback (si solo hay 1 cuenta de ese banco-moneda no importa)
    print('\nListando objetos en bucket estados-cuenta...', flush=True)
    paths = list_bucket_objects('estados-cuenta')
    print(f'Objetos: {len(paths)}', flush=True)

    # Cargar filas existentes
    code, existentes = http(
        'GET',
        '/rest/v1/estados_cuenta_bancarios?select=cuenta_id,periodo_inicio,periodo_fin,formato',
    )
    set_existentes = {
        (e['cuenta_id'], e['periodo_inicio'], e['periodo_fin'], e['formato'])
        for e in (existentes or [])
    }
    print(f'Filas existentes: {len(set_existentes)}', flush=True)

    creadas = 0
    saltadas = 0
    sin_match = 0
    parse_err = 0

    for path in paths:
        parsed = parse_path(path)
        if not parsed:
            parse_err += 1
            continue

        banco_real = BANCO_PATH_TO_REAL.get(parsed['banco_key'])
        if not banco_real:
            sin_match += 1
            continue

        cuenta_id = cuenta_index.get(
            (parsed['empresa_id'], banco_real, parsed['currency'])
        )
        if not cuenta_id:
            sin_match += 1
            continue

        año, mes = parsed['año'], parsed['mes']
        periodo_inicio = date(año, mes, 1).isoformat()
        # último día del mes
        if mes == 12:
            ultimo = date(año, 12, 31)
        else:
            ultimo = date(año, mes + 1, 1).fromordinal(
                date(año, mes + 1, 1).toordinal() - 1
            )
        periodo_fin = ultimo.isoformat()

        if (cuenta_id, periodo_inicio, periodo_fin, 'pdf') in set_existentes:
            saltadas += 1
            continue

        payload = {
            'cuenta_id': cuenta_id,
            'empresa_id': parsed['empresa_id'],
            'periodo_inicio': periodo_inicio,
            'periodo_fin': periodo_fin,
            'saldo_final': 0,  # placeholder; pendiente de extracción IA
            'formato': 'pdf',
            'url_archivo': path,
            'observaciones': 'Pendiente: extraer saldo y movimientos del PDF',
        }
        code, body = http(
            'POST',
            '/rest/v1/estados_cuenta_bancarios',
            payload,
            headers={'Prefer': 'return=minimal'},
        )
        if code in (200, 201, 204):
            creadas += 1
            set_existentes.add((cuenta_id, periodo_inicio, periodo_fin, 'pdf'))
            if creadas % 25 == 0:
                print(f'  Creadas: {creadas}', flush=True)
        else:
            print(f'  ✗ {code}: {str(body)[:200]}', flush=True)

    print(f'\n=== RESUMEN ===', flush=True)
    print(f'PDFs en bucket    : {len(paths)}', flush=True)
    print(f'Filas creadas     : {creadas}', flush=True)
    print(f'Saltadas (existían): {saltadas}', flush=True)
    print(f'Sin match cuenta  : {sin_match}', flush=True)
    print(f'Path no parseable : {parse_err}', flush=True)


if __name__ == '__main__':
    main()
