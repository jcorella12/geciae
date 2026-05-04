# -*- coding: utf-8 -*-
"""
Importador de CFDI con soporte de PDFs adjuntos.

Diferencias vs import_cfdi_batch.py:
1. Pre-carga UUIDs ya en BD para reportar duplicados ANTES del POST.
2. Para cada XML, busca PDF emparejado por UUID (sin guiones, .pdf
   en la misma carpeta, case-insensitive) y lo sube al bucket cfdi.
3. Llena cfdi.url_pdf cuando hay PDF disponible.

Uso:
    python scripts/import_cfdi_with_pdfs.py <directorio>
"""
import sys
import os
import glob
import json
import urllib.request
import urllib.error
from datetime import datetime
from xml.etree import ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://dtmcqjtqykbkapzebbik.supabase.co'
SERVICE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6'
    'ImR0bWNxanRxeWtia2FwemViYmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6'
    'MTc3NzU5MjM4MCwiZXhwIjoyMDkzMTY4MzgwfQ.-0TfmY0JaZTSn62jqtcmeroNeLX99'
    'Soa654OVbO1hwY'
)

TIPO_DB = {
    'I': 'ingreso',
    'E': 'egreso',
    'T': 'traslado',
    'P': 'pago',
    'N': 'nomina',
}


def fnum(v, default=0.0):
    if v is None or v == '':
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def parse_cfdi(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    ns_uri = root.tag.split('}')[0].lstrip('{') if '}' in root.tag else ''
    ns = {'c': ns_uri} if ns_uri else {}
    if root.tag.split('}')[-1] != 'Comprobante':
        raise ValueError('No es un Comprobante CFDI')

    emisor = root.find('c:Emisor', ns)
    receptor = root.find('c:Receptor', ns)
    conceptos_node = root.find('c:Conceptos', ns)
    impuestos_node = root.find('c:Impuestos', ns)
    complemento = root.find('c:Complemento', ns)

    tfd = None
    if complemento is not None:
        for child in complemento:
            if child.tag.endswith('TimbreFiscalDigital'):
                tfd = child
                break

    conceptos = []
    if conceptos_node is not None:
        for i, c in enumerate(conceptos_node.findall('c:Concepto', ns)):
            iva_tasa = None
            iva_importe = None
            imp_c = c.find('c:Impuestos', ns)
            if imp_c is not None:
                tras_c = imp_c.find('c:Traslados', ns)
                if tras_c is not None:
                    tn = tras_c.find('c:Traslado', ns)
                    if tn is not None:
                        iva_tasa = fnum(tn.get('TasaOCuota'), None)
                        iva_importe = fnum(tn.get('Importe'), None)
            conceptos.append({
                'orden': i + 1,
                'clave_sat': c.get('ClaveProdServ'),
                'descripcion': c.get('Descripcion') or '',
                'cantidad': fnum(c.get('Cantidad'), 0),
                'unidad_sat': c.get('ClaveUnidad'),
                'precio_unitario': fnum(c.get('ValorUnitario'), 0),
                'importe': fnum(c.get('Importe'), 0),
                'iva_tasa': iva_tasa,
                'iva_importe': iva_importe,
            })

    iva_trasladado = 0.0
    iva_retenido = 0.0
    isr_retenido = 0.0
    if impuestos_node is not None:
        iva_trasladado = fnum(impuestos_node.get('TotalImpuestosTrasladados'), 0)
        iva_retenido = fnum(impuestos_node.get('TotalImpuestosRetenidos'), 0)
        rets = impuestos_node.find('c:Retenciones', ns)
        if rets is not None:
            iva_r, isr_r = 0.0, 0.0
            for r in rets.findall('c:Retencion', ns):
                imp = r.get('Impuesto')
                amt = fnum(r.get('Importe'), 0)
                if imp == '001':
                    isr_r += amt
                elif imp == '002':
                    iva_r += amt
            if isr_r > 0:
                isr_retenido = isr_r
            if iva_r > 0:
                iva_retenido = iva_r

    return {
        'version': root.get('Version') or '4.0',
        'serie': root.get('Serie'),
        'folio': root.get('Folio'),
        'fecha_emision': root.get('Fecha') or datetime.utcnow().isoformat(),
        'fecha_timbrado': tfd.get('FechaTimbrado') if tfd is not None else None,
        'uuid_sat': tfd.get('UUID') if tfd is not None else None,
        'rfc_emisor': emisor.get('Rfc') if emisor is not None else '',
        'nombre_emisor': emisor.get('Nombre') if emisor is not None else None,
        'rfc_receptor': receptor.get('Rfc') if receptor is not None else '',
        'nombre_receptor': receptor.get('Nombre') if receptor is not None else None,
        'tipo_comprobante': root.get('TipoDeComprobante') or 'I',
        'uso_cfdi': receptor.get('UsoCFDI') if receptor is not None else None,
        'metodo_pago': root.get('MetodoPago'),
        'forma_pago': root.get('FormaPago'),
        'moneda': root.get('Moneda') or 'MXN',
        'tipo_cambio': fnum(root.get('TipoCambio'), 1.0),
        'subtotal': fnum(root.get('SubTotal'), 0),
        'descuento': fnum(root.get('Descuento'), 0),
        'iva_trasladado': iva_trasladado,
        'iva_retenido': iva_retenido,
        'isr_retenido': isr_retenido,
        'total': fnum(root.get('Total'), 0),
        'conceptos': conceptos,
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


def upload_storage(path_in_bucket, raw_bytes, content_type):
    url = f'{SUPABASE_URL}/storage/v1/object/cfdi/{path_in_bucket}'
    req = urllib.request.Request(
        url, data=raw_bytes, method='POST',
        headers={
            'Authorization': f'Bearer {SERVICE_KEY}',
            'apikey': SERVICE_KEY,
            'Content-Type': content_type,
            'x-upsert': 'true',
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def cargar_uuids_existentes():
    """Devuelve set con TODOS los uuid_sat ya en cfdi (cualquier empresa)."""
    print('Cargando UUIDs ya en BD...')
    uuids = set()
    offset = 0
    page = 1000
    while True:
        code, body = http(
            'GET',
            f'/rest/v1/cfdi?select=uuid_sat,empresa_id&order=created_at.asc',
            headers={'Range': f'{offset}-{offset+page-1}'},
        )
        if code not in (200, 206) or not isinstance(body, list) or not body:
            break
        for row in body:
            uuids.add((row['uuid_sat'].upper(), row['empresa_id']))
        offset += len(body)
        if len(body) < page:
            break
    print(f'  → {len(uuids)} pares (uuid, empresa) en BD')
    return uuids


def find_pdf_for_uuid(folder, uuid):
    """Busca el PDF emparejado con el XML de este UUID.
    Acepta:
      - {UUID_sin_guiones}.pdf  (formato SAT/iae_factura)
      - {UUID_con_guiones}.pdf  (formato staging)
      - variantes con sufijo .1.pdf, .2.pdf
    """
    if not uuid:
        return None
    uuid_compact = uuid.replace('-', '').upper()
    uuid_dashed = uuid.upper()
    try:
        for f in os.listdir(folder):
            if not f.lower().endswith('.pdf'):
                continue
            base = f.rsplit('.pdf', 1)[0].upper()
            # admite "UUID" o "UUID.1" o "UUID.2"
            if (
                base == uuid_compact
                or base == uuid_dashed
                or base.startswith(uuid_compact + '.')
                or base.startswith(uuid_dashed + '.')
            ):
                return os.path.join(folder, f)
    except FileNotFoundError:
        pass
    return None


def main(directorio):
    code, empresas = http('GET', '/rest/v1/empresas?select=id,codigo,rfc&activa=eq.true')
    rfc_to_empresa = {(e['rfc'] or '').upper(): e for e in empresas}
    print(f'Empresas en grupo: {[e["codigo"]+":"+(e["rfc"] or "?") for e in empresas]}')
    rfcs_grupo = {(e['rfc'] or '').upper() for e in empresas if e['rfc']}

    uuids_existentes = cargar_uuids_existentes()

    files = sorted(glob.glob(os.path.join(directorio, '**', '*.xml'), recursive=True))
    print(f'XMLs a procesar: {len(files)}')
    print()

    insertados = 0
    duplicados_pre = 0  # ya estaban en BD (skip antes del POST)
    duplicados_post = 0  # 409 al insertar (race)
    pdfs_subidos = 0
    pdfs_no_encontrados = 0
    errores = 0
    sin_empresa = 0
    por_empresa = {}
    por_emisor = {}
    duplicados_por_empresa = {}

    for i, f in enumerate(files):
        try:
            with open(f, 'rb') as fh:
                raw = fh.read()
            parsed = parse_cfdi(f)
            uuid = parsed['uuid_sat']
            if not uuid:
                errores += 1
                continue
            uuid_up = uuid.upper()

            rfc_emi = (parsed['rfc_emisor'] or '').upper()
            rfc_rec = (parsed['rfc_receptor'] or '').upper()

            registros = []
            if rfc_emi in rfcs_grupo:
                registros.append((rfc_to_empresa[rfc_emi], True))
            if rfc_rec in rfcs_grupo:
                registros.append((rfc_to_empresa[rfc_rec], False))

            if not registros:
                sin_empresa += 1
                continue

            es_inter_co = len(registros) == 2

            # Busqueda de PDF emparejado (en la carpeta del XML)
            xml_folder = os.path.dirname(f)
            pdf_path = find_pdf_for_uuid(xml_folder, uuid)
            pdf_bytes = None
            if pdf_path:
                try:
                    with open(pdf_path, 'rb') as pfh:
                        pdf_bytes = pfh.read()
                except Exception:
                    pdf_bytes = None
            else:
                pdfs_no_encontrados += 1

            for empresa, es_emitido in registros:
                if (uuid_up, empresa['id']) in uuids_existentes:
                    duplicados_pre += 1
                    duplicados_por_empresa[empresa['codigo']] = (
                        duplicados_por_empresa.get(empresa['codigo'], 0) + 1
                    )
                    continue

                # Subir XML
                xml_storage = f'{empresa["id"]}/{uuid}.xml'
                upload_storage(xml_storage, raw, 'application/xml')

                # Subir PDF si existe
                pdf_storage = None
                if pdf_bytes:
                    pdf_storage = f'{empresa["id"]}/{uuid}.pdf'
                    code_pdf = upload_storage(
                        pdf_storage, pdf_bytes, 'application/pdf'
                    )
                    if code_pdf in (200, 201):
                        pdfs_subidos += 1

                payload = {
                    'empresa_id': empresa['id'],
                    'tipo': TIPO_DB.get(parsed['tipo_comprobante'], 'ingreso'),
                    'es_emitido': es_emitido,
                    'serie': parsed['serie'],
                    'folio': parsed['folio'],
                    'uuid_sat': uuid,
                    'fecha_emision': parsed['fecha_emision'],
                    'fecha_timbrado': parsed['fecha_timbrado'],
                    'rfc_emisor': parsed['rfc_emisor'],
                    'nombre_emisor': parsed['nombre_emisor'],
                    'rfc_receptor': parsed['rfc_receptor'],
                    'nombre_receptor': parsed['nombre_receptor'],
                    'uso_cfdi': parsed['uso_cfdi'],
                    'metodo_pago': parsed['metodo_pago'],
                    'forma_pago': parsed['forma_pago'],
                    'moneda': parsed['moneda'],
                    'tipo_cambio': parsed['tipo_cambio'],
                    'subtotal': parsed['subtotal'],
                    'descuento': parsed['descuento'],
                    'iva_trasladado': parsed['iva_trasladado'],
                    'iva_retenido': parsed['iva_retenido'],
                    'isr_retenido': parsed['isr_retenido'],
                    'total': parsed['total'],
                    'url_xml': xml_storage,
                    'url_pdf': pdf_storage,
                    'estado': 'timbrado',
                    'pac_proveedor': 'sat_descarga',
                }

                code, body = http(
                    'POST',
                    '/rest/v1/cfdi',
                    payload,
                    headers={'Prefer': 'return=representation'},
                )
                if code == 201:
                    insertados += 1
                    cfdi_row = body[0] if isinstance(body, list) else body
                    if parsed['conceptos']:
                        conceptos_payload = [
                            {**c, 'cfdi_id': cfdi_row['id']}
                            for c in parsed['conceptos']
                        ]
                        http('POST', '/rest/v1/cfdi_conceptos', conceptos_payload)
                    key = empresa['codigo'] + (' (emit)' if es_emitido else ' (rec)')
                    por_empresa[key] = por_empresa.get(key, 0) + 1
                    por_emisor[rfc_emi] = por_emisor.get(rfc_emi, 0) + 1
                    # marcar como existente para futuras iteraciones
                    uuids_existentes.add((uuid_up, empresa['id']))
                elif code == 409 or (
                    isinstance(body, str) and 'duplicate' in body.lower()
                ):
                    duplicados_post += 1
                else:
                    errores += 1
                    if errores <= 5:
                        print(f'  ERROR {code}: {os.path.basename(f)} → {str(body)[:200]}')

            if es_inter_co:
                por_empresa['INTER_CO_PARES'] = (
                    por_empresa.get('INTER_CO_PARES', 0) + 1
                )

            if (i + 1) % 200 == 0:
                print(
                    f'  Progreso: {i+1}/{len(files)} (ok={insertados}, '
                    f'dup_pre={duplicados_pre}, dup_post={duplicados_post}, '
                    f'pdfs={pdfs_subidos}, err={errores})'
                )
        except Exception as e:
            errores += 1
            if errores <= 5:
                print(f'  EXC: {os.path.basename(f)} → {e}')

    print()
    print(f'=== RESUMEN ===')
    print(f'Total XMLs procesados        : {len(files)}')
    print(f'Insertados nuevos            : {insertados}')
    print(f'Duplicados (ya en BD)        : {duplicados_pre}')
    print(f'Duplicados (race en POST)    : {duplicados_post}')
    print(f'PDFs subidos al bucket       : {pdfs_subidos}')
    print(f'XMLs sin PDF emparejado      : {pdfs_no_encontrados}')
    print(f'Sin empresa del grupo        : {sin_empresa}')
    print(f'Errores                      : {errores}')
    print()
    print(f'Inserciones por empresa:')
    for k, n in sorted(por_empresa.items(), key=lambda x: -x[1]):
        print(f'  {n:5}  {k}')
    print()
    if duplicados_por_empresa:
        print(f'Duplicados ignorados por empresa:')
        for k, n in sorted(duplicados_por_empresa.items(), key=lambda x: -x[1]):
            print(f'  {n:5}  {k}')
    print()
    print(f'Top emisores nuevos:')
    for rfc, n in sorted(por_emisor.items(), key=lambda x: -x[1])[:10]:
        print(f'  {n:5}x  {rfc}')


if __name__ == '__main__':
    directorio = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\usuario\AppData\Local\Temp\cfdi_extract_v2'
    main(directorio)
