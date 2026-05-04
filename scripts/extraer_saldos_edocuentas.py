# -*- coding: utf-8 -*-
"""
Para cada fila de estados_cuenta_bancarios con saldo_final = 0 (placeholder),
descarga el PDF del bucket, extrae datos del estado de cuenta vía Claude vision
y actualiza la fila con saldo_inicial, saldo_final, total_abonos, total_cargos,
num_abonos, num_cargos.

También actualiza el saldo_actual de la cuenta bancaria con el saldo final
del último estado de cuenta procesado.
"""
import os
import sys
import json
import base64
import time
import urllib.parse
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
ANTHROPIC_API_KEY = (
    os.environ.get('ANTHROPIC_API_KEY')
    or open(r'D:\SynologyCIAE\SynologyDrive\ERPCIAE\pse-erp\.env.local')
    .read().split('ANTHROPIC_API_KEY=')[1].split('\n')[0].strip()
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
        data = body if isinstance(body, (bytes, bytearray)) else json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode('utf-8')
            return resp.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode('utf-8')
        return e.code, text


def download_pdf(bucket_path):
    encoded = urllib.parse.quote(bucket_path, safe='/')
    url = f'{SUPABASE_URL}/storage/v1/object/estados-cuenta/{encoded}'
    req = urllib.request.Request(
        url,
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'apikey': SERVICE_KEY,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()
    except Exception as e:
        print(f'   download err: {e}', flush=True)
        return None


def extract_resumen(pdf_bytes, banco):
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode('ascii')
    system = (
        "Eres un asistente especializado en estados de cuenta bancarios mexicanos. "
        "Solo respondes JSON válido. Sin texto adicional ni markdown."
    )
    prompt = f"""Este es un estado de cuenta de {banco}. Extrae el RESUMEN del periodo:

- saldo_inicial: saldo al inicio del periodo (NUMÉRICO)
- saldo_final: saldo al cierre del periodo (NUMÉRICO)
- total_abonos: suma de depósitos/abonos del periodo
- total_cargos: suma de retiros/cargos del periodo
- num_abonos: número de movimientos de abono
- num_cargos: número de movimientos de cargo
- periodo_inicio: fecha inicio del periodo en formato YYYY-MM-DD
- periodo_fin: fecha fin del periodo en formato YYYY-MM-DD

REGLAS:
- Solo números. Sin formato, punto decimal, sin separador de miles.
- Si un campo NO aparece o es ilegible: null. NO inventes.
- Los abonos suman positivo, los cargos suman positivo (en valor absoluto).
- Las fechas exactamente como las muestre el estado de cuenta.

Formato (SOLO JSON):
{{"saldo_inicial":number|null,"saldo_final":number|null,"total_abonos":number|null,"total_cargos":number|null,"num_abonos":number|null,"num_cargos":number|null,"periodo_inicio":"YYYY-MM-DD"|null,"periodo_fin":"YYYY-MM-DD"|null}}"""

    payload = {
        'model': 'claude-haiku-4-5',
        'max_tokens': 600,
        'system': system,
        'messages': [
            {
                'role': 'user',
                'content': [
                    {
                        'type': 'document',
                        'source': {
                            'type': 'base64',
                            'media_type': 'application/pdf',
                            'data': pdf_b64,
                        },
                    },
                    {'type': 'text', 'text': prompt},
                ],
            }
        ],
    }
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            text = data['content'][0]['text'].strip()
            if text.startswith('```'):
                text = text.strip('`').lstrip('json').strip()
            return json.loads(text)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f'   Claude HTTP {e.code}: {body[:200]}', flush=True)
        return None
    except Exception as e:
        print(f'   Claude error: {e}', flush=True)
        return None


def main():
    # Cargar todas las filas con saldo placeholder
    code, rows = http(
        'GET',
        '/rest/v1/estados_cuenta_bancarios?select=id,cuenta_id,empresa_id,periodo_inicio,periodo_fin,saldo_final,url_archivo,observaciones&saldo_final=eq.0&order=periodo_fin.desc',
    )
    if not isinstance(rows, list):
        print(f'Error cargando rows: {rows}', flush=True)
        return

    print(f'Filas a procesar: {len(rows)}', flush=True)

    # Cargar bancos_cuentas para mapear cuenta_id → banco
    code, cuentas = http('GET', '/rest/v1/bancos_cuentas?select=id,banco,empresa_id,saldo_actual')
    cuenta_by_id = {c['id']: c for c in cuentas}

    actualizadas = 0
    sin_url = 0
    download_err = 0
    extract_err = 0

    # Mantener última fecha procesada por cuenta para actualizar saldo_actual
    saldos_ultimos = {}

    for i, r in enumerate(rows):
        url = r.get('url_archivo')
        if not url:
            sin_url += 1
            continue

        cuenta = cuenta_by_id.get(r['cuenta_id'])
        banco = cuenta['banco'] if cuenta else 'banco mexicano'

        print(f'\n[{i+1}/{len(rows)}] {banco} {r["periodo_fin"]}', flush=True)
        print(f'   {url}', flush=True)

        pdf = download_pdf(url)
        if not pdf:
            download_err += 1
            continue

        # PDFs muy grandes (>30MB) los skip
        if len(pdf) > 30 * 1024 * 1024:
            print(f'   PDF demasiado grande ({len(pdf)/1024/1024:.1f}MB), skip', flush=True)
            extract_err += 1
            continue

        d = extract_resumen(pdf, banco)
        if not d:
            extract_err += 1
            continue

        # Validar saldo_final
        saldo_final = d.get('saldo_final')
        if saldo_final is None:
            extract_err += 1
            print(f'   ✗ Sin saldo_final extraíble', flush=True)
            continue

        payload = {
            'saldo_inicial': d.get('saldo_inicial'),
            'saldo_final': saldo_final,
            'total_abonos': d.get('total_abonos'),
            'total_cargos': d.get('total_cargos'),
            'num_abonos': d.get('num_abonos'),
            'num_cargos': d.get('num_cargos'),
            'observaciones': 'Datos extraídos vía Claude vision',
        }
        # Si extrajo periodos reales, actualizarlos
        if d.get('periodo_inicio'):
            payload['periodo_inicio'] = d['periodo_inicio']
        if d.get('periodo_fin'):
            payload['periodo_fin'] = d['periodo_fin']

        payload_clean = {k: v for k, v in payload.items() if v is not None}

        code, body = http(
            'PATCH',
            f'/rest/v1/estados_cuenta_bancarios?id=eq.{r["id"]}',
            payload_clean,
            headers={'Prefer': 'return=minimal'},
        )
        if code in (200, 204):
            actualizadas += 1
            print(
                f'   ✓ ${saldo_final:,.2f} | abonos={d.get("total_abonos") or 0:,.2f} ({d.get("num_abonos") or 0}) | cargos={d.get("total_cargos") or 0:,.2f} ({d.get("num_cargos") or 0})',
                flush=True,
            )
            # Track último para actualizar cuenta
            key = r['cuenta_id']
            cur = saldos_ultimos.get(key, ('', 0))
            if r['periodo_fin'] > cur[0]:
                saldos_ultimos[key] = (r['periodo_fin'], saldo_final)
        else:
            extract_err += 1
            print(f'   ✗ {code}: {str(body)[:200]}', flush=True)

    # Actualizar saldo_actual de cada cuenta con el último estado
    print(f'\nActualizando saldos actuales de cuentas...', flush=True)
    for cuenta_id, (fecha, saldo) in saldos_ultimos.items():
        http(
            'PATCH',
            f'/rest/v1/bancos_cuentas?id=eq.{cuenta_id}',
            {
                'saldo_actual': saldo,
                'fecha_actualizacion_saldo': fecha + 'T23:59:59+00:00',
            },
            headers={'Prefer': 'return=minimal'},
        )

    print(f'\n=== RESUMEN ===', flush=True)
    print(f'Procesadas      : {len(rows)}', flush=True)
    print(f'Actualizadas    : {actualizadas}', flush=True)
    print(f'Sin url_archivo : {sin_url}', flush=True)
    print(f'Errores download: {download_err}', flush=True)
    print(f'Errores extract : {extract_err}', flush=True)
    print(f'Cuentas con saldo actualizado: {len(saldos_ultimos)}', flush=True)


if __name__ == '__main__':
    main()
