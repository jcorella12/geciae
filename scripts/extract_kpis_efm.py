# -*- coding: utf-8 -*-
"""
Para cada paquete EFM, descarga Balance General + Estado de Resultados del bucket
y extrae KPIs (ingresos, egresos, utilidad neta, IVA, flujo) vía Claude vision.

Actualiza la fila correspondiente en estados_financieros_mensuales.
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
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode('utf-8')
            return resp.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode('utf-8')
        return e.code, text


def download_pdf(bucket_path):
    url = f'{SUPABASE_URL}/storage/v1/object/estados-financieros/{bucket_path}'
    req = urllib.request.Request(
        url,
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'apikey': SERVICE_KEY,
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except Exception:
        return None


def extract_kpis(balance_pdf, er_pdf):
    """Llama Claude con ambos PDFs y extrae KPIs."""
    contenido = []
    if balance_pdf:
        contenido.append({
            'type': 'document',
            'source': {
                'type': 'base64',
                'media_type': 'application/pdf',
                'data': base64.standard_b64encode(balance_pdf).decode('ascii'),
            },
        })
        contenido.append({'type': 'text', 'text': 'PDF anterior: Balance General.'})
    if er_pdf:
        contenido.append({
            'type': 'document',
            'source': {
                'type': 'base64',
                'media_type': 'application/pdf',
                'data': base64.standard_b64encode(er_pdf).decode('ascii'),
            },
        })
        contenido.append({'type': 'text', 'text': 'PDF anterior: Estado de Resultados.'})

    contenido.append({
        'type': 'text',
        'text': """Extrae los siguientes KPIs financieros consolidados del periodo:
- ingresos_totales: total de ingresos del Estado de Resultados (NUMÉRICO en MXN, sin formato)
- egresos_totales: total de egresos/costos+gastos del ER
- utilidad_neta: utilidad/(pérdida) neta del periodo (puede ser negativa)
- iva_trasladado: IVA por pagar / a cargo del periodo (del Balance: pasivo o del catálogo)
- iva_acreditable: IVA acreditable / a favor del periodo (activo)
- flujo_efectivo: flujo de efectivo neto del periodo (si está disponible)

REGLAS:
- Solo números, sin formato. Punto decimal, sin separador de miles.
- Si un campo no aparece o es ilegible: null.
- NUNCA inventes datos. Sólo lo que se vea claramente.
- Las utilidades pueden ser negativas (pérdida).

Formato de salida (SOLO JSON, sin markdown):
{
  "ingresos_totales": number | null,
  "egresos_totales": number | null,
  "utilidad_neta": number | null,
  "iva_trasladado": number | null,
  "iva_acreditable": number | null,
  "flujo_efectivo": number | null
}""",
    })

    payload = {
        'model': 'claude-haiku-4-5',
        'max_tokens': 800,
        'messages': [
            {'role': 'user', 'content': contenido},
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


def main():
    code, paquetes = http(
        'GET',
        '/rest/v1/estados_financieros_mensuales?'
        'select=id,empresa_id,anio,mes,documentos,utilidad_neta&'
        'order=anio.desc,mes.desc',
    )
    if not isinstance(paquetes, list):
        print(f'No se pudo cargar paquetes: {paquetes}', flush=True)
        return

    print(f'Paquetes: {len(paquetes)}', flush=True)

    procesados = 0
    actualizados = 0
    sin_documentos = 0
    errores = 0

    for p in paquetes:
        # Skip ya procesados
        if p.get('utilidad_neta') is not None:
            continue
        docs = p.get('documentos') or {}
        balance_path = docs.get('balance_general')
        er_path = docs.get('estado_resultados')
        if not balance_path and not er_path:
            sin_documentos += 1
            continue

        print(
            f'\n→ {p["anio"]}-{p["mes"]:02d} ({"BG" if balance_path else "—"} + '
            f'{"ER" if er_path else "—"})',
            flush=True,
        )
        balance_pdf = download_pdf(balance_path) if balance_path else None
        er_pdf = download_pdf(er_path) if er_path else None
        if not balance_pdf and not er_pdf:
            errores += 1
            continue

        kpis = extract_kpis(balance_pdf, er_pdf)
        if not kpis:
            errores += 1
            continue

        payload = {
            'utilidad_neta': kpis.get('utilidad_neta'),
            'ingresos_totales': kpis.get('ingresos_totales'),
            'egresos_totales': kpis.get('egresos_totales'),
            'iva_trasladado': kpis.get('iva_trasladado'),
            'iva_acreditable': kpis.get('iva_acreditable'),
            'flujo_efectivo': kpis.get('flujo_efectivo'),
            'updated_at': 'now()',
        }
        # Filtrar None para no enviar nulls innecesarios
        payload_clean = {k: v for k, v in payload.items() if v is not None}
        if not payload_clean:
            errores += 1
            continue
        # Pero sí queremos updated_at
        payload_clean['updated_at'] = 'now()'

        code, body = http(
            'PATCH',
            f'/rest/v1/estados_financieros_mensuales?id=eq.{p["id"]}',
            payload_clean,
            headers={'Prefer': 'return=minimal'},
        )
        if code in (200, 204):
            actualizados += 1
            print(
                f'   ✓ U={kpis.get("utilidad_neta")} I={kpis.get("ingresos_totales")} '
                f'E={kpis.get("egresos_totales")}',
                flush=True,
            )
        else:
            errores += 1
            print(f'   ✗ {code}: {str(body)[:200]}', flush=True)
        procesados += 1

    print(f'\n=== RESUMEN ===', flush=True)
    print(f'Procesados   : {procesados}', flush=True)
    print(f'Actualizados : {actualizados}', flush=True)
    print(f'Sin docs     : {sin_documentos}', flush=True)
    print(f'Errores      : {errores}', flush=True)


if __name__ == '__main__':
    main()
