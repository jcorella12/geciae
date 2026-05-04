# -*- coding: utf-8 -*-
"""
Importa estado de cuenta BBVA Maestra PYME — versión genérica con pdfplumber.

Usa coordenadas X de las palabras del PDF para distinguir CARGOS vs ABONOS
con precisión (las columnas están a x≈362 y x≈422 respectivamente).

Detecta automáticamente:
  - RFC del titular → empresa del grupo
  - número de cuenta + CLABE
  - periodo + saldo final
  - movimientos con clasificación correcta cargo/abono

Uso:
    python scripts/import_estado_cuenta_bbva.py <ruta_pdf>
"""

import sys
import re
import json
import urllib.request
import urllib.error
import pdfplumber

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)

MES_MAP = {
    'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
}


def http(method, path, body=None, headers=None):
    h = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    if headers:
        h.update(headers)
    data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None
    req = urllib.request.Request(SUPABASE_URL + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode('utf-8')
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')


def parse_metadata(texto):
    """Extrae metadatos del header del PDF."""
    rfc = re.search(r'R\.F\.C\s+([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})', texto, re.I)
    cuenta = re.search(r'No\.\s*de\s*Cuenta\s+(\d+)', texto)
    clabe = re.search(r'No\.\s*Cuenta\s*CLABE\s+(\d{18})', texto)
    periodo = re.search(
        r'Periodo\s+DEL\s+(\d{2}/\d{2}/\d{4})\s+AL\s+(\d{2}/\d{2}/\d{4})',
        texto,
    )
    titular = re.search(
        r'^([A-Z][A-Z\s,\.&Ñ]+(?:S\.?A\.?|S\.?C\.?|SC|SAPI|SRL)[A-Z\s,\.]+)$',
        texto, re.M,
    )
    saldo_final = re.search(r'Saldo Final \(\+\)\s+([\d,]+\.\d{2})', texto)
    saldo_inicial = re.search(
        r'Saldo de Liquidaci[oó]n Inicial\s+([\d,]+\.\d{2})', texto,
    )
    abonos = re.search(r'Dep[oó]sitos / Abonos \(\+\)\s+(\d+)\s+([\d,]+\.\d{2})', texto)
    cargos = re.search(r'Retiros / Cargos \(-\)\s+(\d+)\s+([\d,]+\.\d{2})', texto)

    return {
        'rfc': rfc.group(1).upper() if rfc else None,
        'cuenta': cuenta.group(1) if cuenta else None,
        'clabe': clabe.group(1) if clabe else None,
        'periodo_inicio': periodo.group(1) if periodo else None,
        'periodo_fin': periodo.group(2) if periodo else None,
        'saldo_inicial': float(saldo_inicial.group(1).replace(',', '')) if saldo_inicial else None,
        'saldo_final': float(saldo_final.group(1).replace(',', '')) if saldo_final else None,
        'titular': titular.group(1).strip() if titular else None,
        'abonos_count': int(abonos.group(1)) if abonos else 0,
        'abonos_total': float(abonos.group(2).replace(',', '')) if abonos else 0,
        'cargos_count': int(cargos.group(1)) if cargos else 0,
        'cargos_total': float(cargos.group(2).replace(',', '')) if cargos else 0,
    }


def parse_fecha(txt, anio):
    m = re.match(r'(\d{1,2})/([A-Z]{3})', txt.upper())
    if not m:
        return None
    return f'{anio:04d}-{MES_MAP[m.group(2)]:02d}-{int(m.group(1)):02d}'


def parse_movimientos_con_columnas(pdf_path, anio):
    """
    Parser usando coordenadas X de pdfplumber.

    Columnas BBVA Maestra PYME:
      - CARGOS:      x ≈ 362
      - ABONOS:      x ≈ 422
      - OPERACIÓN:   x ≈ 475
      - LIQUIDACIÓN: x ≈ 539
    Threshold: x < 395 = cargo, 395-450 = abono, > 450 = saldo.
    """
    movimientos = []
    rx_fecha = re.compile(r'^\d{2}/[A-Z]{3}$')

    with pdfplumber.open(pdf_path) as pdf:
        # Acumular todas las palabras de todas las páginas con su línea (top)
        # y orden por página.
        for page in pdf.pages:
            words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
            # Agrupar palabras por línea (mismo `top` aprox)
            words_sorted = sorted(words, key=lambda w: (round(w['top']), w['x0']))
            lineas = []
            actual = []
            top_actual = None
            for w in words_sorted:
                if top_actual is None or abs(w['top'] - top_actual) < 3:
                    actual.append(w)
                    top_actual = w['top']
                else:
                    lineas.append(actual)
                    actual = [w]
                    top_actual = w['top']
            if actual:
                lineas.append(actual)

            i = 0
            while i < len(lineas):
                line = lineas[i]
                # Línea de movimiento: comienza con DD/MES DD/MES COD ...
                if (len(line) >= 4 and rx_fecha.match(line[0]['text'])
                        and rx_fecha.match(line[1]['text'])):
                    fecha_op = parse_fecha(line[0]['text'], anio)
                    fecha_liq = parse_fecha(line[1]['text'], anio)
                    codigo = line[2]['text']

                    # Identificar montos por posición
                    montos = []  # list of (x_centro, valor)
                    desc_words = []
                    for w in line[3:]:
                        t = w['text']
                        if re.match(r'^[\d,]+\.\d{2}$', t):
                            x_centro = (w['x0'] + w['x1']) / 2
                            valor = float(t.replace(',', ''))
                            montos.append((x_centro, valor))
                        else:
                            desc_words.append(t)

                    if not montos:
                        i += 1
                        continue

                    # Clasificar montos por columna X
                    cargo_val = None
                    abono_val = None
                    saldos = []
                    for x_centro, valor in montos:
                        if x_centro < 395:
                            cargo_val = valor
                        elif x_centro < 460:
                            abono_val = valor
                        else:
                            saldos.append(valor)

                    if cargo_val is None and abono_val is None:
                        # No detectó; usa el primer monto como cargo por defecto
                        cargo_val = montos[0][1]

                    descripcion = ' '.join(desc_words)

                    # Detalle en línea siguiente
                    detalle = None
                    referencia = None
                    if i + 1 < len(lineas):
                        sig = lineas[i + 1]
                        # Si la siguiente NO es un movimiento, es detalle
                        if not (
                            len(sig) >= 2
                            and rx_fecha.match(sig[0]['text'])
                            and rx_fecha.match(sig[1]['text'])
                        ):
                            sig_text = ' '.join(w['text'] for w in sig)
                            detalle = sig_text
                            rm = re.search(r'Ref\.?\s+([A-Z0-9]+)', sig_text, re.I)
                            if rm:
                                referencia = rm.group(0).strip()
                            i += 1

                    if cargo_val is not None:
                        tipo = 'cargo'
                        monto_signed = -abs(cargo_val)
                    else:
                        tipo = 'abono'
                        monto_signed = abs(abono_val)

                    concepto_full = (
                        f'{descripcion} · {detalle}' if detalle else descripcion
                    )

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


def procesar(pdf_path):
    # Header text from page 1 (suficiente para metadatos)
    with pdfplumber.open(pdf_path) as pdf:
        texto_meta = '\n'.join(p.extract_text() for p in pdf.pages[:2])

    meta = parse_metadata(texto_meta)
    print(f'\n=== Metadatos ===')
    print(f'  RFC: {meta["rfc"]}  |  Titular: {meta["titular"]}')
    print(f'  Cuenta: {meta["cuenta"]}  |  CLABE: {meta["clabe"]}')
    print(f'  Periodo: {meta["periodo_inicio"]} - {meta["periodo_fin"]}')
    print(f'  Saldo inicial: ${meta["saldo_inicial"]:,.2f}  →  Final: ${meta["saldo_final"]:,.2f}')
    print(f'  Esperados — abonos: {meta["abonos_count"]} mov · ${meta["abonos_total"]:,.2f}')
    print(f'  Esperados — cargos: {meta["cargos_count"]} mov · ${meta["cargos_total"]:,.2f}')

    if not meta['rfc'] or not meta['cuenta']:
        print('ERROR: no se pudo detectar RFC o cuenta.')
        sys.exit(1)

    code, empresas = http(
        'GET',
        f'/rest/v1/empresas?select=id,codigo,razon_social,rfc&rfc=eq.{meta["rfc"]}',
    )
    if not empresas:
        print(f'\nERROR: RFC {meta["rfc"]} no está en empresas del grupo.')
        sys.exit(1)
    empresa = empresas[0]
    print(f'  Empresa del grupo: {empresa["codigo"]} · {empresa["razon_social"]}')

    # Asegurar cuenta
    code, existentes = http(
        'GET',
        f'/rest/v1/bancos_cuentas?select=id&numero_cuenta=eq.{meta["cuenta"]}'
        f'&empresa_id=eq.{empresa["id"]}',
    )
    p_fin = meta['periodo_fin'].split('/')
    fecha_corte = f'{p_fin[2]}-{p_fin[1]}-{p_fin[0]}T23:59:59Z'

    if existentes:
        cuenta_id = existentes[0]['id']
        http('PATCH', f'/rest/v1/bancos_cuentas?id=eq.{cuenta_id}', {
            'saldo_actual': meta['saldo_final'],
            'fecha_actualizacion_saldo': fecha_corte,
        })
        print(f'  Cuenta actualizada: {cuenta_id}')
    else:
        code, body = http('POST', '/rest/v1/bancos_cuentas', {
            'empresa_id': empresa['id'],
            'banco': 'BBVA México',
            'numero_cuenta': meta['cuenta'],
            'clabe': meta['clabe'],
            'alias': 'Maestra PYME · Centro PYME Hermosillo',
            'tipo': 'cheques',
            'moneda': 'MXN',
            'saldo_actual': meta['saldo_final'],
            'fecha_actualizacion_saldo': fecha_corte,
            'activa': True,
        }, headers={'Prefer': 'return=representation'})
        cuenta_id = body[0]['id']
        print(f'  Cuenta creada: {cuenta_id}')

    # Parsear con coordenadas
    anio = int(meta['periodo_fin'].split('/')[2])
    movimientos = parse_movimientos_con_columnas(pdf_path, anio)
    print(f'\nMovimientos parseados: {len(movimientos)}')

    # Borrar previos del mismo periodo
    p_ini = meta['periodo_inicio'].split('/')
    fecha_ini = f'{p_ini[2]}-{p_ini[1]}-{p_ini[0]}'
    fecha_fin = f'{p_fin[2]}-{p_fin[1]}-{p_fin[0]}'
    code, deleted = http(
        'DELETE',
        f'/rest/v1/bancos_movimientos?cuenta_id=eq.{cuenta_id}'
        f'&fecha=gte.{fecha_ini}&fecha=lte.{fecha_fin}'
        f'&origen=eq.import_pdf_bbva',
        headers={'Prefer': 'return=representation'},
    )
    if isinstance(deleted, list):
        print(f'  Borrados {len(deleted)} previos')

    rows = [{**m, 'cuenta_id': cuenta_id} for m in movimientos]
    inserted = 0
    for i in range(0, len(rows), 50):
        chunk = rows[i:i + 50]
        code, body = http(
            'POST', '/rest/v1/bancos_movimientos', chunk,
            headers={'Prefer': 'return=minimal'},
        )
        if code in (200, 201, 204):
            inserted += len(chunk)

    abonos_d = sum(m['monto'] for m in movimientos if m['tipo'] == 'abono')
    cargos_d = sum(abs(m['monto']) for m in movimientos if m['tipo'] == 'cargo')
    n_abono = sum(1 for m in movimientos if m['tipo'] == 'abono')
    n_cargo = sum(1 for m in movimientos if m['tipo'] == 'cargo')

    # Subir el PDF al bucket y registrar estado de cuenta archivado
    import os
    archivo_path = f'{empresa["id"]}/{cuenta_id}/{p_fin[2]}-{p_fin[1]}.pdf'
    with open(pdf_path, 'rb') as fh:
        pdf_bytes = fh.read()
    upload_url = f'{SUPABASE_URL}/storage/v1/object/estados-cuenta/{archivo_path}'
    upreq = urllib.request.Request(
        upload_url, data=pdf_bytes, method='POST',
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'apikey': SERVICE_KEY,
            'Content-Type': 'application/pdf',
            'x-upsert': 'true',
        },
    )
    try:
        with urllib.request.urlopen(upreq) as r:
            pass
    except urllib.error.HTTPError as e:
        print(f'  ⚠ Error subiendo PDF al bucket: {e.code}')

    # Upsert del registro en estados_cuenta_bancarios
    edocta_payload = {
        'cuenta_id': cuenta_id,
        'empresa_id': empresa['id'],
        'periodo_inicio': fecha_ini,
        'periodo_fin': fecha_fin,
        'saldo_inicial': meta['saldo_inicial'],
        'saldo_final': meta['saldo_final'],
        'total_abonos': meta['abonos_total'],
        'total_cargos': meta['cargos_total'],
        'num_abonos': meta['abonos_count'],
        'num_cargos': meta['cargos_count'],
        'formato': 'pdf',
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
    print(f'  Insertados: {inserted}/{len(rows)}')
    print(f'  Abonos: {n_abono} mov · ${abonos_d:,.2f}  (esperado: {meta["abonos_count"]} · ${meta["abonos_total"]:,.2f})')
    print(f'  Cargos: {n_cargo} mov · ${cargos_d:,.2f}  (esperado: {meta["cargos_count"]} · ${meta["cargos_total"]:,.2f})')
    print(f'  Diff abonos: ${meta["abonos_total"] - abonos_d:+,.2f}')
    print(f'  Diff cargos: ${cargos_d - meta["cargos_total"]:+,.2f}')


if __name__ == '__main__':
    pdf = sys.argv[1] if len(sys.argv) > 1 else None
    if not pdf:
        print('Uso: python import_estado_cuenta_bbva.py <ruta_pdf>')
        sys.exit(1)
    procesar(pdf)
