# -*- coding: utf-8 -*-
"""Genera SQL idempotente para cargar los empleados del Excel de IAE."""

import pandas as pd
import json
import sys
from datetime import datetime

DF = pd.read_excel(
    'C:/Users/usuario/Downloads/empleados.xlsx',
    sheet_name='Empleados',
    dtype=str,
)


def esc(s):
    if s is None or pd.isna(s) or str(s).strip() == '' or str(s).lower() == 'nan':
        return 'NULL'
    return "'" + str(s).strip().replace("'", "''") + "'"


def parse_fecha(v):
    if v is None or pd.isna(v) or str(v).strip() == '' or str(v).lower() == 'nan':
        return None
    s = str(v).strip()
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def empresa_codigo(email):
    if email and '@psenergia.com.mx' in str(email).lower():
        return 'PSE'
    return 'CIAE'


def genero_norm(v):
    if not v or pd.isna(v):
        return None
    s = str(v).strip().lower()
    if 'hombre' in s or s in ('m', 'masculino'):
        return 'masculino'
    if 'mujer' in s or s == 'f' or 'femenino' in s:
        return 'femenino'
    return None


def estado_civil_norm(v):
    if not v or pd.isna(v):
        return None
    s = str(v).strip().lower()
    if 'soltero' in s:
        return 'soltero'
    if 'casado' in s:
        return 'casado'
    if 'union' in s or 'libre' in s:
        return 'union_libre'
    if 'divorc' in s:
        return 'divorciado'
    if 'viud' in s:
        return 'viudo'
    return None


def safe(r, k):
    """Get a field, return None if NaN or empty"""
    v = r.get(k)
    if v is None or pd.isna(v):
        return None
    s = str(v).strip()
    if not s or s.lower() == 'nan':
        return None
    return s


# Construir registros
rows = []
for _, r in DF.iterrows():
    parts = [safe(r, k) for k in ['Nombre', 'Apellido paterno', 'Apellido materno']]
    nombre = ' '.join([p for p in parts if p])
    if not nombre:
        continue
    curp = safe(r, 'CURP')
    if not curp:
        continue

    email = safe(r, 'Email')

    # Buscar key con N° ext (puede venir con caracteres extraños por encoding)
    n_ext_key = next((k for k in r.keys() if k.startswith('N') and 'ext' in k.lower()), None)
    n_int_key = next((k for k in r.keys() if k.startswith('N') and 'int' in k.lower()), None)
    tel_key = next((k for k in r.keys() if 'el' in k.lower() and 'fono' in k.lower()), 'Teléfono')
    cat_key = next((k for k in r.keys() if 'ategor' in k.lower()), 'Categoría')

    domicilio = {
        'calle': safe(r, 'Calle'),
        'numero_exterior': safe(r, n_ext_key) if n_ext_key else None,
        'numero_interior': safe(r, n_int_key) if n_int_key else None,
        'colonia': safe(r, 'Colonia'),
        'municipio': safe(r, 'Municipio'),
        'estado': safe(r, 'Estado'),
        'cp': safe(r, 'CP'),
    }
    domicilio = {k: v for k, v in domicilio.items() if v}

    cuenta = {
        'banco': safe(r, 'Banco'),
        'cuenta': safe(r, 'Cuenta Bancaria'),
        'clabe': safe(r, 'CLABE'),
    }
    cuenta = {k: v for k, v in cuenta.items() if v}

    activo_raw = safe(r, 'Activo') or ''
    activo = 'TRUE' if activo_raw.lower() in ('si', 's', 'sí', 'true', 'yes', '1') else 'FALSE'

    sueldo_raw = safe(r, 'Sueldo')
    try:
        sueldo_num = float(sueldo_raw) if sueldo_raw else None
    except (ValueError, TypeError):
        sueldo_num = None

    rows.append({
        'empresa_codigo': empresa_codigo(email),
        'numero_empleado': safe(r, 'Clave') or '',
        'nombre_completo': nombre,
        'curp': curp.upper(),
        'rfc': (safe(r, 'RFC') or '').upper() or None,
        'nss': safe(r, 'No. Seguro Social'),
        'email_personal': email,
        'telefono': safe(r, tel_key),
        'fecha_nacimiento': parse_fecha(r.get('Fecha de nacimiento')),
        'fecha_ingreso': parse_fecha(r.get('Fecha Alta')) or '2024-01-01',
        'genero': genero_norm(r.get('Sexo')),
        'estado_civil': estado_civil_norm(r.get('Estado civil')),
        'puesto': safe(r, 'Puesto') or 'Por definir',
        'area': safe(r, 'Departamento'),
        'salario_base': sueldo_num,
        'domicilio': domicilio if domicilio else None,
        'cuenta_bancaria': cuenta if cuenta else None,
        'activo': activo,
    })


def jstr(d):
    if not d:
        return 'NULL'
    return "'" + json.dumps(d, ensure_ascii=False).replace("'", "''") + "'::JSONB"


# Output SQL — forzar UTF-8 (Windows por default escribe en cp1252)
output_path = sys.argv[1] if len(sys.argv) > 1 else None
if output_path:
    out = open(output_path, 'w', encoding='utf-8', newline='\n')
else:
    sys.stdout.reconfigure(encoding='utf-8')
    out = sys.stdout
out.write(f"-- Carga de {len(rows)} empleados desde empleados.xlsx\n\n")
out.write("DO $$\n")
out.write("DECLARE\n")
out.write("  v_emp_pse  UUID;\n")
out.write("  v_emp_ciae UUID;\n")
out.write("BEGIN\n")
out.write("  SELECT id INTO v_emp_pse FROM empresas WHERE codigo = 'PSE';\n")
out.write("  SELECT id INTO v_emp_ciae FROM empresas WHERE codigo = 'CIAE';\n\n")

for i, r in enumerate(rows):
    emp_var = 'v_emp_pse' if r['empresa_codigo'] == 'PSE' else 'v_emp_ciae'
    sb = str(r['salario_base']) if r['salario_base'] is not None else 'NULL'

    out.write(f"  -- {i+1}. {r['nombre_completo']} ({r['empresa_codigo']})\n")
    out.write("  INSERT INTO empleados (\n")
    out.write("    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,\n")
    out.write("    email_personal, telefono, fecha_nacimiento, fecha_ingreso,\n")
    out.write("    genero, estado_civil, categoria, puesto, area, salario_base,\n")
    out.write("    domicilio, cuenta_bancaria, activo\n")
    out.write("  ) VALUES (\n")
    out.write(
        f"    {emp_var}, {esc(r['numero_empleado'])}, {esc(r['nombre_completo'])}, "
        f"{esc(r['curp'])},\n"
    )
    out.write(f"    {esc(r['rfc'])}, {esc(r['nss'])},\n")
    out.write(
        f"    {esc(r['email_personal'])}, {esc(r['telefono'])}, "
        f"{esc(r['fecha_nacimiento'])}::DATE, {esc(r['fecha_ingreso'])}::DATE,\n"
    )
    out.write(
        f"    {esc(r['genero'])}, {esc(r['estado_civil'])}, 'planta'::categoria_personal, "
        f"{esc(r['puesto'])}, {esc(r['area'])}, {sb},\n"
    )
    out.write(f"    {jstr(r['domicilio'])}, {jstr(r['cuenta_bancaria'])}, {r['activo']}\n")
    out.write("  ) ON CONFLICT (curp) DO UPDATE SET\n")
    out.write("    empresa_id = EXCLUDED.empresa_id,\n")
    out.write("    numero_empleado = EXCLUDED.numero_empleado,\n")
    out.write("    nombre_completo = EXCLUDED.nombre_completo,\n")
    out.write("    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),\n")
    out.write("    nss = COALESCE(EXCLUDED.nss, empleados.nss),\n")
    out.write("    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),\n")
    out.write("    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),\n")
    out.write("    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),\n")
    out.write("    fecha_ingreso = EXCLUDED.fecha_ingreso,\n")
    out.write("    genero = COALESCE(EXCLUDED.genero, empleados.genero),\n")
    out.write("    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),\n")
    out.write("    puesto = EXCLUDED.puesto,\n")
    out.write("    area = EXCLUDED.area,\n")
    out.write("    salario_base = EXCLUDED.salario_base,\n")
    out.write("    domicilio = EXCLUDED.domicilio,\n")
    out.write("    cuenta_bancaria = EXCLUDED.cuenta_bancaria,\n")
    out.write("    activo = EXCLUDED.activo,\n")
    out.write("    updated_at = NOW();\n\n")

out.write("END $$;\n")
