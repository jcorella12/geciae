# -*- coding: utf-8 -*-
"""
Recolecta TODOS los XMLs de D:\\CONTABILIDAD (CFDI sueltos + nóminas timbradas
+ ZIPs anidados con XML+PDF) y los copia a un staging dir, manteniendo el
PDF emparejado para que el importador lo encuentre.

Estrategia:
- Para cada XML encontrado en disco: copiar al staging dir, y si existe un PDF
  con el mismo nombre base (o con UUID-sin-guiones del XML), copiarlo también.
- Para cada ZIP encontrado: extraer al staging dir.

Resultado: una sola carpeta plana por origen, lista para `import_cfdi_with_pdfs.py`.
"""
import os
import shutil
import sys
import zipfile
from xml.etree import ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'D:\CONTABILIDAD'
STAGE = r'C:\Users\usuario\AppData\Local\Temp\contabilidad_extract'

os.makedirs(STAGE, exist_ok=True)


def extract_uuid(xml_path):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        ns_uri = root.tag.split('}')[0].lstrip('{') if '}' in root.tag else ''
        ns = {'c': ns_uri} if ns_uri else {}
        complemento = root.find('c:Complemento', ns)
        if complemento is not None:
            for child in complemento:
                if child.tag.endswith('TimbreFiscalDigital'):
                    return (child.get('UUID') or '').upper() or None
    except Exception:
        return None
    return None


def main():
    xmls = []
    zips = []
    for dirpath, _, files in os.walk(ROOT):
        for f in files:
            full = os.path.join(dirpath, f)
            ext = f.lower().rsplit('.', 1)[-1] if '.' in f else ''
            if ext == 'xml':
                xmls.append(full)
            elif ext == 'zip':
                zips.append(full)

    print(f'XMLs encontrados : {len(xmls)}', flush=True)
    print(f'ZIPs encontrados : {len(zips)}', flush=True)

    copiados = 0
    pdfs_emparejados = 0
    skipped = 0
    duplicados_uuid = set()

    # --- 1) Procesar XMLs sueltos ---
    for i, xml in enumerate(xmls):
        try:
            uuid = extract_uuid(xml)
            if not uuid:
                skipped += 1
                continue
            if uuid in duplicados_uuid:
                continue
            duplicados_uuid.add(uuid)

            target_xml = os.path.join(STAGE, f'{uuid}.xml')
            shutil.copy2(xml, target_xml)
            copiados += 1

            # Buscar PDF: misma carpeta, mismo basename, o uuid sin dashes
            base = os.path.splitext(xml)[0]
            uuid_compact = uuid.replace('-', '')
            xml_dir = os.path.dirname(xml)
            candidatos = [
                base + '.pdf',
                base + '.PDF',
                os.path.join(xml_dir, uuid_compact + '.pdf'),
                os.path.join(xml_dir, uuid_compact + '.PDF'),
                os.path.join(xml_dir, uuid + '.pdf'),
            ]
            pdf_found = None
            for cand in candidatos:
                if os.path.exists(cand):
                    pdf_found = cand
                    break
            if not pdf_found:
                # buscar por listdir (case-insensitive) dentro del mismo folder
                try:
                    for entry in os.listdir(xml_dir):
                        if not entry.lower().endswith('.pdf'):
                            continue
                        ent_lower = entry.lower()
                        if uuid_compact.lower() in ent_lower:
                            pdf_found = os.path.join(xml_dir, entry)
                            break
                except Exception:
                    pass
            if pdf_found:
                shutil.copy2(pdf_found, os.path.join(STAGE, f'{uuid}.pdf'))
                pdfs_emparejados += 1

            if (i + 1) % 500 == 0:
                print(
                    f'  XMLs: {i+1}/{len(xmls)} (copiados={copiados}, pdfs={pdfs_emparejados})',
                    flush=True,
                )
        except Exception as e:
            print(f'  EXC XML {os.path.basename(xml)}: {e}', flush=True)

    # --- 2) Procesar ZIPs (extraer XMLs y PDFs nuevos al stage) ---
    print(f'\nProcesando ZIPs...', flush=True)
    zip_xmls = 0
    zip_pdfs = 0
    for j, z in enumerate(zips):
        try:
            with zipfile.ZipFile(z) as zf:
                for member in zf.namelist():
                    name_lower = member.lower()
                    base = os.path.basename(member)
                    if not base:
                        continue
                    if name_lower.endswith('.xml') or name_lower.endswith('.pdf'):
                        # Extraer a un subdir único por zip para no pisar
                        subdir = os.path.join(
                            STAGE, '_zips', os.path.basename(z).replace('.zip', '')
                        )
                        os.makedirs(subdir, exist_ok=True)
                        try:
                            data = zf.read(member)
                            with open(os.path.join(subdir, base), 'wb') as fh:
                                fh.write(data)
                            if name_lower.endswith('.xml'):
                                zip_xmls += 1
                            else:
                                zip_pdfs += 1
                        except Exception:
                            pass
        except Exception as e:
            print(f'  EXC ZIP {os.path.basename(z)}: {e}', flush=True)
        if (j + 1) % 50 == 0:
            print(f'  ZIPs: {j+1}/{len(zips)} (xmls={zip_xmls}, pdfs={zip_pdfs})', flush=True)

    print(f'\n=== STAGING LISTO ===', flush=True)
    print(f'XMLs únicos en stage          : {copiados}', flush=True)
    print(f'PDFs emparejados              : {pdfs_emparejados}', flush=True)
    print(f'XMLs sin UUID parseable       : {skipped}', flush=True)
    print(f'XMLs adicionales de ZIPs      : {zip_xmls}', flush=True)
    print(f'PDFs adicionales de ZIPs      : {zip_pdfs}', flush=True)
    print(f'Carpeta staging: {STAGE}', flush=True)


if __name__ == '__main__':
    main()
