# -*- coding: utf-8 -*-
"""
Crea cuentas bancarias para cada combinación (empresa, banco) extrayendo
los datos del primer estado de cuenta disponible vía Claude vision.

Solo crea cuentas que aún no existen.
"""
import os
import sys
import json
import base64
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
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY') or open(
    r'D:\SynologyCIAE\SynologyDrive\ERPCIAE\pse-erp\.env.local'
).read().split('ANTHROPIC_API_KEY=')[1].split('\n')[0].strip()

EMPRESA_FOLDER_MAP = {
    'PSE': 'PSE',
    'IAE': 'CIAE',
    'IED': 'IED',
    'LIMSON': 'LIMSON',
}

BANCO_NAMES_MAP = {
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


def detect_bank(filename):
    f = filename.upper()
    if 'BANCOMER' in f or 'BBVA' in f: return 'BBVA'
    if 'MONEX' in f: return 'MONEX'
    if 'SCOTIABANK' in f or 'SCOTIA' in f: return 'SCOTIA'
    if 'BANREGIO' in f: return 'BANREGIO'
    if 'BANORTE' in f: return 'BANORTE'
    if 'KONFIO' in f: return 'KONFIO'
    return None


def detect_currency(filename):
    f = filename.upper()
    if 'DOLAR' in f or 'USD' in f or 'DLS' in f: return 'USD'
    return 'MXN'


def extract_via_claude(pdf_bytes, banco, currency):
    """Llama a Claude vision para extraer numero_cuenta y clabe del PDF."""
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode('ascii')

    system = """Eres un asistente que extrae datos del titular de una cuenta
bancaria a partir de la primera página de un estado de cuenta mexicano.
Responde SOLO con JSON válido, sin texto extra ni markdown."""

    user = f"""Esta es la primera página de un estado de cuenta de {banco}.
Extrae los siguientes campos:
- numero_cuenta: número de cuenta (ej. "0120855219" o "0124477162")
- clabe: CLABE interbancaria 18 dígitos (si aparece, sino null)
- alias: si el banco asigna un nombre/alias visible (ej. "Maestra PYME"), sino null
- tipo: "cheques", "ahorro", "inversion", "credito" — según lo que se vea
- moneda: "MXN" o "USD" (asumido: {currency})
- titular: razón social del titular (sin abreviaturas como "S.A. DE C.V.")

Formato de salida:
{{"numero_cuenta":"...","clabe":"...","alias":"...","tipo":"...","moneda":"...","titular":"..."}}

Si algún campo no es legible o no aparece, devuélvelo como null. NUNCA inventes."""

    payload = {
        'model': 'claude-haiku-4-5',
        'max_tokens': 500,
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
                    {'type': 'text', 'text': user},
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
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            text = data['content'][0]['text']
            # parsear primer bloque JSON
            text = text.strip()
            if text.startswith('```'):
                text = text.strip('`').lstrip('json').strip()
            return json.loads(text)
    except Exception as e:
        print(f'  Claude error: {e}', flush=True)
        return None


def find_sample_pdf(empresa_folder, banco):
    """Busca el primer PDF de estado de cuenta para esa combinación."""
    base = os.path.join(ROOT, empresa_folder, 'BANCO')
    if not os.path.isdir(base):
        base = os.path.join(ROOT, empresa_folder, 'BANCOS')
    if not os.path.isdir(base):
        return None

    candidates = []
    for dirpath, _, files in os.walk(base):
        for f in files:
            if not f.lower().endswith('.pdf'):
                continue
            fu = f.upper()
            if 'EDO' not in fu and 'ESTADO_DE_CUENTA' not in fu:
                # IED/LIMSON BANORTE pueden tener nombres distintos
                if banco != 'BANORTE':
                    continue
            b = detect_bank(f)
            # Si banco viene del archivo o del path
            if b is None and banco == 'BANORTE' and 'BANORTE' in dirpath.upper():
                b = 'BANORTE'
            if b == banco:
                # Preferir USD primero solo si banco=BANREGIO USD; default MXN
                candidates.append(os.path.join(dirpath, f))
    # Preferir MXN sobre USD
    candidates.sort(key=lambda p: (1 if 'DOLAR' in p.upper() or 'USD' in p.upper() else 0, p))
    return candidates[0] if candidates else None


def main():
    code, empresas = http('GET', '/rest/v1/empresas?select=id,codigo,rfc')
    codigo_to_empresa = {e['codigo']: e for e in empresas}

    code, cuentas_existentes = http(
        'GET', '/rest/v1/bancos_cuentas?select=empresa_id,banco,moneda,numero_cuenta'
    )
    existentes = {
        (c['empresa_id'], c['banco'], c.get('moneda') or 'MXN')
        for c in cuentas_existentes
    }
    print(f'Cuentas existentes: {len(existentes)}', flush=True)

    pares = []
    # Por empresa, por banco con PDFs detectados
    for emp_folder, emp_codigo in EMPRESA_FOLDER_MAP.items():
        empresa = codigo_to_empresa.get(emp_codigo)
        if not empresa:
            continue
        for banco in BANCO_NAMES_MAP:
            sample = find_sample_pdf(emp_folder, banco)
            if not sample:
                continue
            banco_real = BANCO_NAMES_MAP[banco]
            currency = detect_currency(os.path.basename(sample))
            if (empresa['id'], banco_real, currency) in existentes:
                continue
            pares.append({
                'empresa_id': empresa['id'],
                'empresa_codigo': emp_codigo,
                'banco': banco,
                'banco_real': banco_real,
                'currency': currency,
                'sample_pdf': sample,
            })

    print(f'Pares (empresa, banco) faltantes: {len(pares)}', flush=True)

    creadas = 0
    fallidas = 0
    for p in pares:
        print(f'\n→ {p["empresa_codigo"]} / {p["banco"]} ({p["currency"]})', flush=True)
        print(f'   Sample: {os.path.basename(p["sample_pdf"])}', flush=True)
        try:
            with open(p['sample_pdf'], 'rb') as fh:
                raw = fh.read()
        except Exception as e:
            print(f'   No se pudo leer PDF: {e}', flush=True)
            fallidas += 1
            continue

        # Limitar tamaño (Claude PDF tiene límite, pero los EDOs son pequeños)
        if len(raw) > 30 * 1024 * 1024:
            print(f'   PDF demasiado grande ({len(raw)/1024/1024:.1f}MB), skip', flush=True)
            fallidas += 1
            continue

        d = extract_via_claude(raw, p['banco_real'], p['currency'])
        if not d:
            fallidas += 1
            continue

        numero = (d.get('numero_cuenta') or '').strip() or 'PENDIENTE'
        clabe = (d.get('clabe') or '').strip() or None
        alias = (d.get('alias') or '').strip() or None
        tipo = (d.get('tipo') or '').strip().lower() or 'cheques'

        payload = {
            'empresa_id': p['empresa_id'],
            'banco': p['banco_real'],
            'numero_cuenta': numero,
            'clabe': clabe,
            'alias': alias,
            'tipo': tipo,
            'moneda': p['currency'],
            'activa': True,
        }
        code, body = http(
            'POST',
            '/rest/v1/bancos_cuentas',
            payload,
            headers={'Prefer': 'return=representation'},
        )
        if code in (201, 200):
            creadas += 1
            row = body[0] if isinstance(body, list) else body
            print(
                f'   ✓ Creada: {numero} / {clabe or "—"} / {alias or "—"} / {tipo}',
                flush=True,
            )
        else:
            fallidas += 1
            print(f'   ✗ {code}: {str(body)[:200]}', flush=True)

    print(f'\n=== RESUMEN ===', flush=True)
    print(f'Cuentas creadas: {creadas}', flush=True)
    print(f'Fallidas       : {fallidas}', flush=True)


if __name__ == '__main__':
    main()
