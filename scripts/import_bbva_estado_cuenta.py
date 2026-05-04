# -*- coding: utf-8 -*-
"""
Importa estado de cuenta BBVA Maestra PYME para CIAE.
- Da de alta la cuenta bancaria si no existe
- Parsea movimientos del PDF y los registra en bancos_movimientos
"""

import sys
import re
import json
import urllib.request
import urllib.error
from datetime import datetime
from pypdf import PdfReader

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)

PDF = 'C:/Users/usuario/Downloads/Info financiera/00741743000120855219CH.pdf'


def http(method, path, body=None, headers=None):
    url = SUPABASE_URL + path
    h = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    if headers:
        h.update(headers)
    data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode('utf-8')
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')


# 1) Crear/asegurar cuenta bancaria
def asegurar_cuenta():
    code, empresas = http('GET', '/rest/v1/empresas?select=id,codigo&codigo=eq.CIAE')
    empresa_id = empresas[0]['id']

    # Buscar si ya existe
    code, existentes = http(
        'GET',
        f'/rest/v1/bancos_cuentas?select=id&numero_cuenta=eq.0120855219&empresa_id=eq.{empresa_id}',
    )
    if existentes:
        print(f'Cuenta ya existía: {existentes[0]["id"]}')
        return existentes[0]['id']

    cuenta = {
        'empresa_id': empresa_id,
        'banco': 'BBVA México',
        'numero_cuenta': '0120855219',
        'clabe': '012760001208552195',
        'alias': 'Maestra PYME · Centro PYME Hermosillo',
        'tipo': 'cheques',
        'moneda': 'MXN',
        'saldo_actual': 820209.96,
        'fecha_actualizacion_saldo': '2026-04-30T23:59:59Z',
        'activa': True,
    }
    code, body = http('POST', '/rest/v1/bancos_cuentas',
                      cuenta, headers={'Prefer': 'return=representation'})
    if code != 201:
        print(f'ERROR creando cuenta: {code} {body}')
        sys.exit(1)
    cid = body[0]['id']
    print(f'Cuenta creada: {cid}')
    return cid


# 2) Parser del PDF
MES_MAP = {
    'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
}


def parse_fecha(txt, anio):
    """'01/ABR' → '2026-04-01'"""
    m = re.match(r'(\d{1,2})/([A-Z]{3})', txt.upper())
    if not m:
        return None
    return f'{anio:04d}-{MES_MAP[m.group(2)]:02d}-{int(m.group(1)):02d}'


def parse_movimientos(pdf_path, anio=2026):
    """
    Parser BBVA — formato observado:
      'DD/MES DD/MES  COD DESCRIPCION ... MONTO [SALDO_OP] [SALDO_LIQ]'

    Si el día tiene corte aparece monto + saldo_op + saldo_liq (3 números).
    Si es movimiento intermedio aparece solo monto (1 número).

    Estrategia: tomar el PRIMER número decimal de la línea como monto.
    Para cargo/abono usar código BBVA + palabras clave en descripción.
    """
    reader = PdfReader(pdf_path)
    todo_texto = '\n'.join(p.extract_text() for p in reader.pages)

    movimientos = []
    lineas = todo_texto.split('\n')

    rx_inicio = re.compile(
        r'^(\d{2}/[A-Z]{3})\s+(\d{2}/[A-Z]{3})\s+'  # fechas oper + liq
        r'([A-Z0-9]{2,4})\s+'                       # código
        r'(.+)$'                                    # resto
    )
    rx_numero = re.compile(r'([\d,]+\.\d{2})')

    # Códigos BBVA observados en el PDF + estándar.
    # Si no está, se infiere por descripción / detalle.
    CODIGOS_CARGO = {
        'N06', 'T17', 'C04', 'T19', 'T18', 'C13', 'C03',
        'N04', 'C05', 'B01', 'B02', 'M55', 'C39', 'C38',
        'C40', 'C45', 'P14', 'P31', 'R01', 'S39', 'S40',
        'X01', 'BT2',
    }
    CODIGOS_ABONO = {
        'T20', 'W02', 'B03', 'C50', 'C49', 'I02', 'Y45',
    }
    # C09 = traspaso entre cuentas: revisar detalle (DE LA CUENTA / A LA CUENTA)

    i = 0
    while i < len(lineas):
        l = lineas[i].strip()
        m = rx_inicio.match(l)
        if not m:
            i += 1
            continue

        fecha_op = parse_fecha(m.group(1), anio)
        fecha_liq = parse_fecha(m.group(2), anio)
        codigo = m.group(3)
        resto = m.group(4)

        # Extraer todos los números decimales de la línea
        nums = rx_numero.findall(resto)
        if not nums:
            # Algunos movimientos pueden tener el monto en la línea siguiente
            i += 1
            continue

        # El primer número es el monto del cargo/abono
        monto = float(nums[0].replace(',', ''))

        # Descripción = resto sin los números finales
        primer_num_pos = resto.find(nums[0])
        descripcion_corta = resto[:primer_num_pos].strip()

        # Línea siguiente: detalles (referencia, contraparte)
        referencia = None
        detalle = None
        if i + 1 < len(lineas):
            sig = lineas[i + 1].strip()
            if sig and not rx_inicio.match(sig) and not sig.startswith('FECHA'):
                detalle = sig
                rm = re.search(
                    r'Ref\.?\s+([A-Z0-9]+)|REFBNTC\d+',
                    sig,
                    re.I,
                )
                if rm:
                    referencia = rm.group(0).strip()
                i += 1

        # Determinar tipo por código BBVA, fallback por palabras clave
        desc_upper = descripcion_corta.upper()
        if codigo in CODIGOS_CARGO:
            tipo = 'cargo'
        elif codigo in CODIGOS_ABONO:
            tipo = 'abono'
        elif any(
            k in desc_upper
            for k in [
                'ENVIADO', 'PAGO ', 'RETIRO', 'COMISION', 'IVA',
                'CHEQUE', 'IMPUESTO', 'CARGO',
            ]
        ):
            tipo = 'cargo'
        elif any(
            k in desc_upper
            for k in ['RECIBIDO', 'DEPOSITO', 'ABONO', 'INTERES']
        ):
            tipo = 'abono'
        else:
            # Ambiguo — TRASPASO ENTRE CUENTAS necesita ver el detalle
            if detalle:
                if 'DE LA CUENTA' in detalle.upper():
                    tipo = 'abono'
                elif 'A LA CUENTA' in detalle.upper():
                    tipo = 'cargo'
                else:
                    tipo = 'cargo'
            else:
                tipo = 'cargo'

        monto_signed = -abs(monto) if tipo == 'cargo' else abs(monto)

        concepto_full = descripcion_corta
        if detalle:
            concepto_full = f'{descripcion_corta} · {detalle}'

        movimientos.append({
            'fecha': fecha_op,
            'fecha_aplicacion': fecha_liq,
            'concepto': concepto_full[:300],
            'referencia': (referencia or codigo)[:50],
            'monto': monto_signed,
            'tipo': tipo,
            'origen': 'import_pdf_bbva',
            'observaciones': f'Codigo BBVA {codigo}',
        })
        i += 1

    return movimientos


def main():
    cuenta_id = asegurar_cuenta()
    movimientos = parse_movimientos(PDF, anio=2026)
    print(f'\nMovimientos parseados: {len(movimientos)}')

    if not movimientos:
        print('No se parsearon movimientos del PDF.')
        return

    # Mostrar muestra
    print(f'\nPrimeros 3:')
    for m in movimientos[:3]:
        print(f'  {m["fecha"]} {m["tipo"]:5} ${m["monto"]:>14,.2f}  {m["concepto"][:80]}')
    print(f'\nÚltimos 3:')
    for m in movimientos[-3:]:
        print(f'  {m["fecha"]} {m["tipo"]:5} ${m["monto"]:>14,.2f}  {m["concepto"][:80]}')

    # Insertar en batches con cuenta_id
    rows = [{**m, 'cuenta_id': cuenta_id} for m in movimientos]
    inserted = 0
    errores = 0
    for i in range(0, len(rows), 50):
        chunk = rows[i:i + 50]
        code, body = http('POST', '/rest/v1/bancos_movimientos', chunk,
                          headers={'Prefer': 'return=minimal'})
        if code in (200, 201, 204):
            inserted += len(chunk)
        else:
            errores += len(chunk)
            print(f'  ERROR batch {i}: {code} → {str(body)[:300]}')

    # Calcular totales para validar
    abonos = sum(m['monto'] for m in movimientos if m['tipo'] == 'abono')
    cargos = sum(abs(m['monto']) for m in movimientos if m['tipo'] == 'cargo')
    print(f'\n=== Resumen ===')
    print(f'Insertados: {inserted}/{len(rows)} (errores: {errores})')
    print(f'Total abonos detectados : ${abonos:>14,.2f}')
    print(f'Total cargos detectados : ${cargos:>14,.2f}')
    print(f'Esperado abonos (BBVA)  : $   1,928,499.69')
    print(f'Esperado cargos (BBVA)  : $   1,963,483.65')


if __name__ == '__main__':
    main()
