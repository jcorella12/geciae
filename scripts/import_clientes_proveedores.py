# -*- coding: utf-8 -*-
"""
Importador batch de clientes y proveedores desde Excel.
Upsert idempotente por RFC vía Supabase REST API.
"""

import sys
import json
import urllib.request
import urllib.error
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)

CLIENTES_XLSX = 'C:/Users/usuario/Downloads/Info financiera/clientes.xlsx'
PROVEEDORES_XLSX = 'C:/Users/usuario/Downloads/Info financiera/proveedores.xlsx'


def s(v):
    """Sanitiza valor: trim + None si vacío/NaN"""
    if v is None or pd.isna(v):
        return None
    txt = str(v).strip()
    return txt if txt and txt.lower() != 'nan' else None


def num(v, default=None):
    if v is None or pd.isna(v):
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def regimen(v):
    """Extrae código del régimen fiscal: '601 - General...' → '601'"""
    txt = s(v)
    if not txt:
        return None
    return txt.split(' - ')[0].split()[0] if ' ' in txt else txt


def direccion(row):
    d = {
        'calle': s(row.get('Calle')),
        'numero_exterior': s(row.get('No. Ext')),
        'numero_interior': s(row.get('No. Int')),
        'cp': s(row.get('Codigo Postal')),
        'colonia': s(row.get('Colonia')),
        'localidad': s(row.get('localidad')),
        'municipio': s(row.get('Municipio')),
        'estado': s(row.get('Estado')),
        'pais': s(row.get('País')) or 'México',
    }
    return {k: v for k, v in d.items() if v}


def cuenta_pago(row):
    cuenta = s(row.get('Cuenta de pago'))
    if not cuenta:
        return None
    return {'cuenta': cuenta}


def tipo_cliente(row):
    """Mapea Tipo del Excel → tipo cliente (residencial/comercial/industrial/gubernamental)."""
    cls = s(row.get('Clasificación')) or ''
    seg = s(row.get('Segmentación')) or ''
    rfc = s(row.get('RFC')) or ''
    name = s(row.get('Nombre, denominación o razón Social')) or ''
    txt = f'{cls} {seg} {name}'.lower()
    if any(k in txt for k in ['gobierno', 'municipio', 'sat', 'imss', 'cfe']):
        return 'gubernamental'
    if 'industrial' in txt:
        return 'industrial'
    # Personas físicas (RFC longitud 13) → residencial; morales (12) → comercial
    if len(rfc.replace(' ', '')) == 13:
        return 'residencial'
    return 'comercial'


def http_request(method, path, body=None, headers=None):
    url = SUPABASE_URL + path
    h = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    if headers:
        h.update(headers)
    data = (
        json.dumps(body, ensure_ascii=False).encode('utf-8')
        if body is not None
        else None
    )
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode('utf-8')
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')


def upsert_batch(table, rows):
    """Upsert con on_conflict por RFC. PostgREST hace bulk."""
    code, body = http_request(
        'POST',
        f'/rest/v1/{table}?on_conflict=rfc',
        rows,
        headers={
            'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
    )
    return code, body


def import_clientes():
    df = pd.read_excel(CLIENTES_XLSX, sheet_name=0, dtype=str)
    print(f'Clientes en Excel: {len(df)}')

    rows = []
    skip_norfc = 0
    rfcs_seen = set()
    duplicados_excel = 0

    for _, r in df.iterrows():
        rfc = s(r.get('RFC'))
        if not rfc:
            skip_norfc += 1
            continue
        rfc = rfc.upper()
        if rfc in rfcs_seen:
            duplicados_excel += 1
            continue
        rfcs_seen.add(rfc)

        razon = s(r.get('Nombre, denominación o razón Social')) or rfc
        rsoc = s(r.get('Régimen societario'))  # SA DE CV, etc.
        razon_full = razon if rsoc and rsoc.upper() in razon.upper() else (
            f'{razon} {rsoc}' if rsoc else razon
        )

        rows.append({
            'rfc': rfc,
            'razon_social': razon_full[:200],
            'curp': s(r.get('CURP')),
            'regimen_fiscal': regimen(r.get('Régimen fiscal')),
            'cp_fiscal': s(r.get('Codigo Postal')),
            'direccion_fiscal': direccion(r) or None,
            'email_facturacion': s(r.get('Correo Electronico')),
            'tipo': tipo_cliente(r),
            'uso_cfdi_default': s(r.get('Uso CFDI')),
            'cuenta_bancaria': cuenta_pago(r),
            'observaciones': (
                'Importado desde Excel · '
                f'Forma pago: {s(r.get("Forma de pago")) or "—"} · '
                f'Método: {s(r.get("Método de pago")) or "—"}'
            ),
            'activo': True,
        })

    print(f'  Filas válidas: {len(rows)}')
    print(f'  Skip (sin RFC): {skip_norfc}')
    print(f'  Duplicados en Excel (mismo RFC): {duplicados_excel}')

    # Procesar en batches de 100
    inserted = 0
    errores = 0
    for i in range(0, len(rows), 100):
        chunk = rows[i:i + 100]
        code, body = upsert_batch('clientes', chunk)
        if code in (200, 201, 204):
            inserted += len(chunk)
        else:
            errores += len(chunk)
            print(f'  ERROR batch {i}: {code} → {str(body)[:300]}')
        if (i + 100) % 500 == 0 or i + 100 >= len(rows):
            print(f'  Progreso: {min(i+100, len(rows))}/{len(rows)}')

    print(f'  ✓ Insertados/actualizados: {inserted}')
    print(f'  ✗ Errores: {errores}')


def import_proveedores():
    df = pd.read_excel(PROVEEDORES_XLSX, sheet_name=0, dtype=str)
    print(f'\nProveedores en Excel: {len(df)}')

    rows = []
    skip_norfc = 0
    rfcs_seen = set()
    duplicados_excel = 0

    for _, r in df.iterrows():
        rfc = s(r.get('RFC'))
        if not rfc:
            skip_norfc += 1
            continue
        rfc = rfc.upper()
        if rfc in rfcs_seen:
            duplicados_excel += 1
            continue
        rfcs_seen.add(rfc)

        razon = s(r.get('Nombre, denominación o razón Social')) or rfc
        rsoc = s(r.get('Régimen societario'))
        razon_full = razon if rsoc and rsoc.upper() in razon.upper() else (
            f'{razon} {rsoc}' if rsoc else razon
        )

        rows.append({
            'rfc': rfc,
            'razon_social': razon_full[:200],
            'curp': s(r.get('CURP')),
            'regimen_fiscal': regimen(r.get('Régimen fiscal')),
            'cp_fiscal': s(r.get('Codigo Postal')),
            'direccion_fiscal': direccion(r) or None,
            'representante_legal': s(r.get('Representante legal')),
            'tipo_proveedor': 'recurrente',
            'cuenta_bancaria': cuenta_pago(r),
            'clasificacion_interna': (
                'estrategico' if s(r.get('Clasificación')) else 'recurrente'
            ),
            'requiere_repse': False,
            'observaciones': (
                'Importado desde Excel · '
                f'Forma pago: {s(r.get("Forma de pago")) or "—"} · '
                f'Método: {s(r.get("Método de pago")) or "—"}'
            ),
            'semaforo': 'verde',
            'activo': True,
        })

    print(f'  Filas válidas: {len(rows)}')
    print(f'  Skip (sin RFC): {skip_norfc}')
    print(f'  Duplicados en Excel (mismo RFC): {duplicados_excel}')

    inserted = 0
    errores = 0
    for i in range(0, len(rows), 100):
        chunk = rows[i:i + 100]
        code, body = upsert_batch('proveedores', chunk)
        if code in (200, 201, 204):
            inserted += len(chunk)
        else:
            errores += len(chunk)
            print(f'  ERROR batch {i}: {code} → {str(body)[:300]}')
        if (i + 100) % 500 == 0 or i + 100 >= len(rows):
            print(f'  Progreso: {min(i+100, len(rows))}/{len(rows)}')

    print(f'  ✓ Insertados/actualizados: {inserted}')
    print(f'  ✗ Errores: {errores}')


if __name__ == '__main__':
    import_clientes()
    import_proveedores()
    print('\n=== DONE ===')
