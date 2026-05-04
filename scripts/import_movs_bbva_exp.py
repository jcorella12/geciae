# -*- coding: utf-8 -*-
"""
Importa movimientos BBVA desde archivo .exp (export TSV diario).

Formato del archivo:
  Día\tConcepto / Referencia\tcargo\tAbono\tSaldo
  30-04-2026\tPAGO DE NOMINA/IN 4208985928 PSENERGIA SOLAR\t8,820.80\t\t644,221.04
  30-04-2026\tSPEI RECIBIDOSANTANDER/0192611321\t\t659,423.39\t825,404.25

Encoding: ISO-8859-1 (latin-1).

Dado que el .exp NO tiene cabecera con cuenta/RFC, el script:
  1) Detecta la empresa del grupo por palabras clave en los conceptos
     (e.g. "PSENERGIA SOLAR" → PSE, "INTELIGENCIA EN AHORRO" → CIAE).
  2) Toma la primera cuenta activa de esa empresa en `bancos_cuentas`.
  3) Inserta movimientos idempotentes (borra previos del rango fecha+cuenta+origen).
  4) Actualiza `saldo_actual` de la cuenta con el saldo del último movimiento.

Uso:
    python scripts/import_movs_bbva_exp.py <ruta_exp> [empresa_codigo]

`empresa_codigo` es opcional — si se pasa fuerza la empresa (PSE/CIAE/IED/LIMSON).
Si no, se detecta del contenido.
"""

import sys
import re
import json
import csv
import urllib.request
import urllib.error
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)

EMPRESAS_KEYWORDS = {
    'PSE': ['PSENERGIA', 'PSE ENERGIA', 'PSO240322'],
    'CIAE': ['INTELIGENCIA EN AHORRO', 'IAE160824', 'CIAE'],
    'IED': ['INGENIERIA ELECTRICA DEL DESIERTO', 'IED191120'],
    'LIMSON': ['LIMSON', 'LIMPIEZA INDUSTRIAL'],
}


def http(method, path, body=None, headers=None):
    h = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    if headers:
        h.update(headers)
    data = (
        json.dumps(body, ensure_ascii=False).encode('utf-8')
        if body is not None else None
    )
    req = urllib.request.Request(SUPABASE_URL + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode('utf-8')
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')


def parse_monto(s):
    s = (s or '').strip()
    if not s:
        return None
    return float(s.replace(',', ''))


def parse_fecha(s):
    """DD-MM-YYYY → YYYY-MM-DD"""
    s = s.strip()
    try:
        return datetime.strptime(s, '%d-%m-%Y').strftime('%Y-%m-%d')
    except ValueError:
        return None


def detectar_codigo_bbva(concepto):
    """Heurística para mapear concepto a código BBVA estándar."""
    c = concepto.upper()
    if 'PAGO DE NOMINA' in c:
        return 'R01'
    if 'SPEI ENVIADO' in c:
        return 'T17'
    if 'SPEI RECIBIDO' in c:
        return 'T20'
    if 'PAGO CUENTA DE TERCERO' in c:
        return 'N06'
    if 'DEPOSITO DE TERCERO' in c:
        return 'W02'
    if 'TRASPASO ENTRE CUENTAS' in c:
        return 'C09'
    if 'TRANSFER BBVA' in c:
        return 'BT2'
    if 'COMPENSACION POR RETRASO' in c:
        return 'Y45'
    if 'IMSS' in c or 'INFONAVIT' in c or 'AFORE' in c:
        return 'X01'
    if 'SAT' in c or 'SECRETARIA DE HACIENDA' in c or 'TELMEX' in c or 'EXEL SOLAR' in c:
        return 'P14'
    if 'ARRENDAMIENTO GLOBAL' in c:
        return 'P31'
    if 'SERV BANCA INTERNET' in c:
        return 'S39'
    if 'IVA COM SERV BCA' in c:
        return 'S40'
    return 'EXP'


def detectar_empresa_de_contenido(filas):
    """Cuenta menciones de palabras clave de cada empresa y elige la más mencionada."""
    counts = {k: 0 for k in EMPRESAS_KEYWORDS}
    for fila in filas:
        concepto = (fila.get('concepto') or '').upper()
        for empresa, kws in EMPRESAS_KEYWORDS.items():
            for kw in kws:
                if kw in concepto:
                    counts[empresa] += 1
                    break
    ordered = sorted(counts.items(), key=lambda x: -x[1])
    if ordered[0][1] == 0:
        return None
    return ordered[0][0]


def leer_exp(path):
    """Lee el archivo .exp como TSV con encoding latin-1."""
    filas = []
    with open(path, 'r', encoding='latin-1', newline='') as f:
        reader = csv.reader(f, delimiter='\t')
        header = next(reader, None)
        if not header:
            return filas
        # Validar header esperado
        # ['Día', 'Concepto / Referencia', 'cargo', 'Abono', 'Saldo']
        for row in reader:
            if not row or not row[0].strip():
                continue
            # Algunos exports pueden tener menos columnas si el último campo está vacío
            row = row + [''] * (5 - len(row))
            fecha = parse_fecha(row[0])
            if not fecha:
                continue
            concepto = row[1].strip()
            cargo = parse_monto(row[2])
            abono = parse_monto(row[3])
            saldo = parse_monto(row[4])
            filas.append({
                'fecha': fecha,
                'concepto': concepto,
                'cargo': cargo,
                'abono': abono,
                'saldo': saldo,
            })
    return filas


def procesar(exp_path, empresa_codigo_forzado=None):
    filas = leer_exp(exp_path)
    print(f'\nMovimientos en archivo: {len(filas)}')
    if not filas:
        print('Archivo vacío.')
        return

    # Detectar empresa
    if empresa_codigo_forzado:
        empresa_codigo = empresa_codigo_forzado.upper()
        print(f'Empresa forzada: {empresa_codigo}')
    else:
        empresa_codigo = detectar_empresa_de_contenido(filas)
        if not empresa_codigo:
            print('ERROR: No pude detectar empresa por contenido.')
            print('Pasa el código de empresa como segundo argumento (PSE/CIAE/IED/LIMSON).')
            sys.exit(1)
        print(f'Empresa detectada: {empresa_codigo}')

    # Buscar empresa
    code, empresas = http(
        'GET',
        f'/rest/v1/empresas?select=id,codigo,razon_social,rfc&codigo=eq.{empresa_codigo}',
    )
    if not empresas:
        print(f'ERROR: empresa {empresa_codigo} no encontrada.')
        sys.exit(1)
    empresa = empresas[0]
    print(f'  → {empresa["razon_social"]} (RFC {empresa["rfc"]})')

    # Buscar cuenta activa de la empresa (la primera)
    code, cuentas = http(
        'GET',
        f'/rest/v1/bancos_cuentas?select=id,banco,numero_cuenta,clabe&'
        f'empresa_id=eq.{empresa["id"]}&activa=eq.true&order=created_at',
    )
    if not cuentas:
        print(f'ERROR: empresa {empresa_codigo} no tiene cuentas bancarias activas.')
        print('Sube primero un PDF de estado de cuenta para crear la cuenta.')
        sys.exit(1)
    cuenta = cuentas[0]
    cuenta_id = cuenta['id']
    print(f'  Cuenta destino: {cuenta["banco"]} {cuenta["numero_cuenta"]}')
    if len(cuentas) > 1:
        print(f'  ⚠ Empresa tiene {len(cuentas)} cuentas — usando la primera.')

    # IMPORTANTE: el .exp viene de más RECIENTE a más ANTIGUO.
    # El saldo actual de la cuenta es el de la primera fila con saldo.
    saldo_actual = None
    for f in filas:
        if f.get('saldo') is not None:
            saldo_actual = f['saldo']
            saldo_fecha = f['fecha']
            break

    # Construir movimientos
    movimientos = []
    fechas = set()
    for f in filas:
        fechas.add(f['fecha'])
        cargo = f.get('cargo')
        abono = f.get('abono')
        if cargo:
            tipo = 'cargo'
            monto_signed = -abs(cargo)
        elif abono:
            tipo = 'abono'
            monto_signed = abs(abono)
        else:
            continue  # ni cargo ni abono — saltar
        codigo = detectar_codigo_bbva(f['concepto'])
        # Separar concepto de referencia con "/"
        concepto = f['concepto']
        ref = None
        if '/' in concepto:
            partes = concepto.split('/', 1)
            concepto_corto = partes[0].strip()
            referencia_str = partes[1].strip()
            ref = referencia_str[:50] if referencia_str else codigo
        else:
            concepto_corto = concepto
            ref = codigo

        movimientos.append({
            'cuenta_id': cuenta_id,
            'fecha': f['fecha'],
            'fecha_aplicacion': f['fecha'],
            'concepto': concepto[:300],
            'referencia': (ref or codigo)[:50],
            'monto': monto_signed,
            'tipo': tipo,
            'saldo_resultante': f.get('saldo'),
            'origen': 'import_exp_bbva',
            'observaciones': f'Codigo BBVA {codigo}',
        })

    if not movimientos:
        print('No se construyeron movimientos válidos.')
        return

    # Borrar previos del rango fecha+cuenta+origen=exp para idempotencia
    fechas_ordenadas = sorted(fechas)
    fecha_min = fechas_ordenadas[0]
    fecha_max = fechas_ordenadas[-1]
    code, deleted = http(
        'DELETE',
        f'/rest/v1/bancos_movimientos?cuenta_id=eq.{cuenta_id}'
        f'&fecha=gte.{fecha_min}&fecha=lte.{fecha_max}'
        f'&origen=eq.import_exp_bbva',
        headers={'Prefer': 'return=representation'},
    )
    if isinstance(deleted, list):
        print(f'  Borrados {len(deleted)} previos del mismo rango')

    # Insertar batches
    inserted = 0
    errores = 0
    for i in range(0, len(movimientos), 50):
        chunk = movimientos[i:i + 50]
        code, body = http(
            'POST', '/rest/v1/bancos_movimientos', chunk,
            headers={'Prefer': 'return=minimal'},
        )
        if code in (200, 201, 204):
            inserted += len(chunk)
        else:
            errores += len(chunk)
            print(f'  ERROR batch {i}: {code} → {str(body)[:200]}')

    # Actualizar saldo_actual con el del primer registro (más reciente cronológicamente)
    if saldo_actual is not None:
        http(
            'PATCH',
            f'/rest/v1/bancos_cuentas?id=eq.{cuenta_id}',
            {
                'saldo_actual': saldo_actual,
                'fecha_actualizacion_saldo': f'{saldo_fecha}T23:59:59Z',
            },
        )
        print(f'  Saldo actualizado: ${saldo_actual:,.2f} ({saldo_fecha})')

    abonos = [m for m in movimientos if m['tipo'] == 'abono']
    cargos = [m for m in movimientos if m['tipo'] == 'cargo']

    # Subir el .exp al bucket y registrar estado de cuenta archivado
    archivo_path = f'{empresa["id"]}/{cuenta_id}/{fecha_min}_{fecha_max}.exp'
    with open(exp_path, 'rb') as fh:
        exp_bytes = fh.read()
    upload_url = f'{SUPABASE_URL}/storage/v1/object/estados-cuenta/{archivo_path}'
    upreq = urllib.request.Request(
        upload_url, data=exp_bytes, method='POST',
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'apikey': SERVICE_KEY,
            'Content-Type': 'text/plain',
            'x-upsert': 'true',
        },
    )
    try:
        with urllib.request.urlopen(upreq) as r:
            pass
    except urllib.error.HTTPError as e:
        print(f'  ⚠ Error subiendo .exp al bucket: {e.code}')

    edocta_payload = {
        'cuenta_id': cuenta_id,
        'empresa_id': empresa['id'],
        'periodo_inicio': fecha_min,
        'periodo_fin': fecha_max,
        'saldo_inicial': None,
        'saldo_final': saldo_actual,
        'total_abonos': sum(m['monto'] for m in abonos),
        'total_cargos': sum(abs(m['monto']) for m in cargos),
        'num_abonos': len(abonos),
        'num_cargos': len(cargos),
        'formato': 'exp',
        'url_archivo': archivo_path,
        'movimientos_cargados': inserted,
    }
    http(
        'POST',
        '/rest/v1/estados_cuenta_bancarios?on_conflict=cuenta_id,periodo_inicio,periodo_fin,formato',
        edocta_payload,
        headers={'Prefer': 'resolution=merge-duplicates,return=minimal'},
    )
    print(f'\n=== Resumen ===')
    print(f'  Periodo: {fecha_min} → {fecha_max}')
    print(f'  Insertados: {inserted}/{len(movimientos)} (errores {errores})')
    print(f'  Abonos: {len(abonos)} mov · ${sum(m["monto"] for m in abonos):,.2f}')
    print(f'  Cargos: {len(cargos)} mov · ${sum(abs(m["monto"]) for m in cargos):,.2f}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python import_movs_bbva_exp.py <ruta_exp> [empresa_codigo]')
        sys.exit(1)
    procesar(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
