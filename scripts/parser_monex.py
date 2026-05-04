# -*- coding: utf-8 -*-
"""
Parser específico de estados de cuenta MONEX.

MONEX tiene DOS tipos de PDF:

1. **Estado de Cuenta Banco** (contrato 35XXXXX) — un PDF con TRES secciones:
   a) Cuenta Vista MXN (resumen + movimientos)
   b) Cuenta Vista USD (resumen + movimientos)
   c) Anexo Crédito (línea revolvente con garantía bursátil)

2. **Estado de Cuenta Casa de Bolsa** (contrato 36XXXXX) — fondo de inversión
   - Saldo de inversión (en valores)
   - Histórico mensual de saldos
   - Composición de la cartera

Este parser:
- Detecta el tipo de PDF
- Extrae los 3-4 productos
- Crea/actualiza las cuentas correspondientes en bancos_cuentas
- Liga el crédito con su cuenta de inversión (garantía)

Uso:
    python scripts/parser_monex.py <ruta_pdf>
    python scripts/parser_monex.py --carpeta <ruta_carpeta>  # procesa todos los PDFs Monex

Usa Claude Haiku con vision para extraer los datos.
"""
import os
import sys
import json
import base64
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


def claude_extract(pdf_bytes, prompt, system="Solo respondes JSON. Sin markdown."):
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode('ascii')
    payload = {
        'model': 'claude-haiku-4-5',
        'max_tokens': 1500,
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
    except Exception as e:
        print(f'  Claude error: {e}', flush=True)
        return None


def detectar_tipo_pdf(pdf_bytes):
    """Identifica si es 'banco' o 'casa_bolsa' según el contenido de la primera página."""
    d = claude_extract(
        pdf_bytes,
        """Mira la primera página de este PDF de Monex y responde SOLO un JSON:
{"tipo": "banco" | "casa_bolsa" | "otro", "rfc_titular": "XXX", "contrato": "NNNNNNN", "periodo_inicio": "YYYY-MM-DD", "periodo_fin": "YYYY-MM-DD"}

- "banco" si dice "Estado de Cuenta Banco" / "Servicios Bancarios" — tiene cuenta vista en MXN/USD y posiblemente línea de crédito
- "casa_bolsa" si dice "Estado de Cuenta Casa de Bolsa" / "Intermediación Bursátil" — fondo de inversión""",
    )
    return d


def extraer_banco_monex(pdf_bytes):
    """Extrae las 3 secciones del PDF Banco Monex."""
    return claude_extract(
        pdf_bytes,
        """Este es un Estado de Cuenta de Banco Monex que tiene 3 secciones internas. Extrae todos los datos en JSON:

{
  "cuenta_mxn": {
    "saldo_inicial": number, "saldo_final": number,
    "total_abonos": number, "total_cargos": number,
    "num_abonos": number|null, "num_cargos": number|null,
    "clabe": "string", "spid": "string"|null
  },
  "cuenta_usd": {
    "saldo_inicial": number, "saldo_final": number,
    "total_abonos": number, "total_cargos": number,
    "num_abonos": number|null, "num_cargos": number|null
  } | null,
  "credito": {
    "fecha_apertura": "YYYY-MM-DD",
    "fecha_vencimiento": "YYYY-MM-DD",
    "monto_aprobado": number,
    "monto_dispuesto": number,
    "saldo_insoluto_actual": number,
    "saldo_insoluto_anterior": number,
    "pagos_realizados_mes": number,
    "tasa_referencia": "TIIE28"|"TIIE91"|null,
    "tasa_referencia_pct": number,
    "tasa_spread_pct": number,
    "tasa_moratoria_pct": number,
    "numero_pago_actual": number,
    "pagos_totales": number,
    "pagos_pendientes": number,
    "proximo_pago_fecha": "YYYY-MM-DD",
    "proximo_pago_monto": number,
    "tipo": "Crédito con Garantía de prenda Bursátil"|"otro"
  } | null,
  "asesor": "string"|null,
  "contrato": "string",
  "rfc_titular": "string",
  "periodo_inicio": "YYYY-MM-DD",
  "periodo_fin": "YYYY-MM-DD"
}

Solo números, sin formato. Si una sección no existe en el PDF, devuelve null. NO inventes.""",
    )


def extraer_casa_bolsa_monex(pdf_bytes):
    """Extrae los datos del PDF Casa de Bolsa Monex (fondo de inversión)."""
    return claude_extract(
        pdf_bytes,
        """Este es un Estado de Cuenta Casa de Bolsa de Monex (fondo de inversión). Extrae:

{
  "contrato": "string",
  "rfc_titular": "string",
  "clabe": "string",
  "asesor": "string"|null,
  "periodo_inicio": "YYYY-MM-DD",
  "periodo_fin": "YYYY-MM-DD",
  "total_inversion_actual": number,
  "total_inversion_anterior": number,
  "depositos": number,
  "retiros": number,
  "plusvalia_bruta": number,
  "plusvalia_neta": number,
  "isr_retenido": number,
  "tasa_rendimiento_anualizada": number,
  "tasa_rendimiento_directa": number,
  "es_garantia": boolean,
  "emisora": "string",
  "tipo_emisora": "string",
  "titulos": number,
  "precio_titulo": number,
  "historico_mensual": [
    {"mes": "MMMM YYYY", "saldo_inicial": number, "depositos": number, "retiros": number, "saldo_final": number}
  ]
}

Si "es_garantia" no es claro, marca true si el documento menciona "Saldo en garantías" o "Valores en prenda bursátil".
NO inventes. Solo números, sin formato.""",
    )


def upsert_cuenta(empresa_id, payload, search_keys):
    """Hace upsert por (empresa_id + search_keys). Si encuentra, hace PATCH; si no, POST."""
    qs_parts = [f'empresa_id=eq.{empresa_id}']
    for k, v in search_keys.items():
        qs_parts.append(f'{k}=eq.{urllib_quote(v)}')
    qs = '&'.join(qs_parts)
    code, found = http('GET', f'/rest/v1/bancos_cuentas?{qs}&select=id')
    if isinstance(found, list) and found:
        row_id = found[0]['id']
        code, body = http(
            'PATCH',
            f'/rest/v1/bancos_cuentas?id=eq.{row_id}',
            payload,
            headers={'Prefer': 'return=representation'},
        )
        return code, body, row_id
    code, body = http(
        'POST',
        '/rest/v1/bancos_cuentas',
        {'empresa_id': empresa_id, **payload},
        headers={'Prefer': 'return=representation'},
    )
    if code in (201, 200):
        row = body[0] if isinstance(body, list) else body
        return code, body, row.get('id')
    return code, body, None


def urllib_quote(v):
    import urllib.parse
    return urllib.parse.quote(str(v), safe='')


def procesar_banco(pdf_bytes, empresa_id):
    print('\n→ Extrayendo Banco Monex...', flush=True)
    d = extraer_banco_monex(pdf_bytes)
    if not d:
        return False
    contrato = d.get('contrato')
    if not contrato:
        print('  ✗ Sin contrato', flush=True)
        return False
    print(f'  Contrato: {contrato} | Periodo: {d.get("periodo_inicio")} → {d.get("periodo_fin")}', flush=True)

    # 1) Cuenta MXN
    mxn = d.get('cuenta_mxn')
    cuenta_mxn_id = None
    if mxn and mxn.get('saldo_final') is not None:
        payload = {
            'banco': 'Monex',
            'numero_cuenta': contrato,  # usa contrato como número
            'contrato': contrato,
            'clabe': mxn.get('clabe'),
            'spid': mxn.get('spid'),
            'alias': 'Monex MXN',
            'tipo': 'cheques',
            'moneda': 'MXN',
            'saldo_actual': mxn.get('saldo_final'),
            'fecha_actualizacion_saldo': (d.get('periodo_fin') or '') + 'T23:59:59+00:00',
            'asesor': d.get('asesor'),
            'activa': True,
        }
        code, body, cuenta_mxn_id = upsert_cuenta(
            empresa_id,
            payload,
            {'banco': 'Monex', 'contrato': contrato, 'moneda': 'MXN'},
        )
        if code in (200, 201):
            print(f'  ✓ MXN $#{mxn["saldo_final"]:,.2f} (id: {cuenta_mxn_id})', flush=True)

    # 2) Cuenta USD
    usd = d.get('cuenta_usd')
    cuenta_usd_id = None
    if usd and usd.get('saldo_final') is not None:
        payload = {
            'banco': 'Monex',
            'numero_cuenta': contrato,
            'contrato': contrato,
            'alias': 'Monex USD',
            'tipo': 'cheques',
            'moneda': 'USD',
            'saldo_actual': usd.get('saldo_final'),
            'fecha_actualizacion_saldo': (d.get('periodo_fin') or '') + 'T23:59:59+00:00',
            'asesor': d.get('asesor'),
            'activa': True,
        }
        code, body, cuenta_usd_id = upsert_cuenta(
            empresa_id,
            payload,
            {'banco': 'Monex', 'contrato': contrato, 'moneda': 'USD'},
        )
        if code in (200, 201):
            print(f'  ✓ USD ${usd["saldo_final"]:,.2f} (id: {cuenta_usd_id})', flush=True)

    # 3) Línea de Crédito
    cred = d.get('credito')
    if cred and cred.get('monto_aprobado') is not None:
        # Buscar la cuenta de inversión (garantía) — del mismo empresa, banco Monex, tipo inversion
        code, garantias = http(
            'GET',
            f'/rest/v1/bancos_cuentas?empresa_id=eq.{empresa_id}&banco=eq.Monex&tipo=eq.inversion&select=id',
        )
        garantia_id = (
            garantias[0]['id'] if isinstance(garantias, list) and garantias else None
        )

        payload = {
            'banco': 'Monex',
            'numero_cuenta': f'{contrato}-CR',
            'contrato': contrato,
            'alias': 'Monex Línea Crédito Revolvente',
            'tipo': 'credito',
            'moneda': 'MXN',
            # saldo_actual = lo que se debe (negativo conceptualmente, pero lo guardamos positivo)
            'saldo_actual': cred.get('saldo_insoluto_actual'),
            'fecha_actualizacion_saldo': (d.get('periodo_fin') or '') + 'T23:59:59+00:00',
            'linea_credito_monto_aprobado': cred.get('monto_aprobado'),
            'linea_credito_dispuesto': cred.get('saldo_insoluto_actual'),
            'linea_credito_tasa_referencia': cred.get('tasa_referencia'),
            'linea_credito_tasa_spread': cred.get('tasa_spread_pct'),
            'linea_credito_tasa_efectiva': (
                (cred.get('tasa_referencia_pct') or 0)
                + (cred.get('tasa_spread_pct') or 0)
            ),
            'linea_credito_fecha_apertura': cred.get('fecha_apertura'),
            'linea_credito_fecha_vencimiento': cred.get('fecha_vencimiento'),
            'linea_credito_proximo_pago_fecha': cred.get('proximo_pago_fecha'),
            'linea_credito_proximo_pago_monto': cred.get('proximo_pago_monto'),
            'linea_credito_pagos_pendientes': cred.get('pagos_pendientes'),
            'cuenta_garantia_id': garantia_id,
            'asesor': d.get('asesor'),
            'activa': True,
        }
        code, body, cred_id = upsert_cuenta(
            empresa_id,
            payload,
            {'banco': 'Monex', 'contrato': contrato, 'tipo': 'credito'},
        )
        if code in (200, 201):
            disponible = cred['monto_aprobado'] - cred.get('saldo_insoluto_actual', 0)
            print(
                f'  ✓ CRÉDITO Aprobado ${cred["monto_aprobado"]:,.2f} | '
                f'Dispuesto ${cred.get("saldo_insoluto_actual", 0):,.2f} | '
                f'Disponible ${disponible:,.2f}',
                flush=True,
            )

    return True


def procesar_casa_bolsa(pdf_bytes, empresa_id):
    print('\n→ Extrayendo Casa de Bolsa Monex...', flush=True)
    d = extraer_casa_bolsa_monex(pdf_bytes)
    if not d:
        return False
    contrato = d.get('contrato')
    if not contrato:
        print('  ✗ Sin contrato', flush=True)
        return False
    print(f'  Contrato: {contrato} | Periodo: {d.get("periodo_inicio")} → {d.get("periodo_fin")}', flush=True)

    payload = {
        'banco': 'Monex',
        'numero_cuenta': contrato,
        'contrato': contrato,
        'clabe': d.get('clabe'),
        'alias': 'Monex Casa de Bolsa - Fondo Inversión',
        'tipo': 'inversion',
        'moneda': 'MXN',
        'saldo_actual': d.get('total_inversion_actual'),
        'fecha_actualizacion_saldo': (d.get('periodo_fin') or '') + 'T23:59:59+00:00',
        'inversion_emisora': d.get('emisora'),
        'inversion_titulos': d.get('titulos'),
        'inversion_precio_titulo': d.get('precio_titulo'),
        'inversion_es_garantia': d.get('es_garantia') or False,
        'inversion_rendimiento_mensual_pct': d.get('tasa_rendimiento_directa'),
        'asesor': d.get('asesor'),
        'activa': True,
    }
    code, body, inv_id = upsert_cuenta(
        empresa_id,
        payload,
        {'banco': 'Monex', 'contrato': contrato, 'tipo': 'inversion'},
    )
    if code in (200, 201):
        print(
            f'  ✓ INVERSIÓN ${d.get("total_inversion_actual"):,.2f} '
            f'({d.get("titulos")} títulos {d.get("emisora")})',
            flush=True,
        )

        # Si es garantía, vincular el crédito
        if d.get('es_garantia'):
            http(
                'PATCH',
                f'/rest/v1/bancos_cuentas?empresa_id=eq.{empresa_id}&banco=eq.Monex&tipo=eq.credito',
                {'cuenta_garantia_id': inv_id},
                headers={'Prefer': 'return=minimal'},
            )
            print(f'  ✓ Vinculada como garantía del crédito', flush=True)

    return True


def procesar_pdf(pdf_path, empresa_codigo_default=None):
    """Procesa un PDF Monex. Auto-detecta empresa por RFC si no se pasa explícito."""
    # Pre-cargar todas las empresas del grupo
    code, empresas = http('GET', '/rest/v1/empresas?select=id,codigo,rfc')
    rfc_to_empresa = {(e['rfc'] or '').upper(): e for e in empresas}
    codigo_to_empresa = {e['codigo']: e for e in empresas}

    with open(pdf_path, 'rb') as fh:
        pdf_bytes = fh.read()

    print(f'\n=== {os.path.basename(pdf_path)} ===', flush=True)
    tipo_info = detectar_tipo_pdf(pdf_bytes)
    if not tipo_info:
        print('  ✗ No se pudo detectar tipo', flush=True)
        return
    tipo = tipo_info.get('tipo')
    rfc = (tipo_info.get('rfc_titular') or '').upper().strip()

    # Determinar empresa: por RFC si está, si no por default
    empresa = rfc_to_empresa.get(rfc)
    if not empresa and empresa_codigo_default:
        empresa = codigo_to_empresa.get(empresa_codigo_default)
    if not empresa:
        print(f'  ✗ Empresa no encontrada para RFC {rfc!r}', flush=True)
        return
    empresa_id = empresa['id']

    print(f'  Tipo: {tipo} | RFC: {rfc} → Empresa: {empresa["codigo"]}', flush=True)

    if tipo == 'banco':
        procesar_banco(pdf_bytes, empresa_id)
    elif tipo == 'casa_bolsa':
        procesar_casa_bolsa(pdf_bytes, empresa_id)
    else:
        print(f'  ✗ Tipo desconocido: {tipo}', flush=True)


def main():
    if len(sys.argv) < 2:
        print('Uso: python parser_monex.py <ruta_pdf> [empresa_codigo=CIAE]')
        return
    pdf_path = sys.argv[1]
    empresa = sys.argv[2] if len(sys.argv) > 2 else 'CIAE'

    if os.path.isdir(pdf_path):
        # Procesar todos los PDFs en la carpeta
        for f in sorted(os.listdir(pdf_path)):
            if f.lower().endswith('.pdf'):
                procesar_pdf(os.path.join(pdf_path, f), empresa)
    else:
        procesar_pdf(pdf_path, empresa)


if __name__ == '__main__':
    main()
