# -*- coding: utf-8 -*-
"""
Wrapper para procesar TODOS los PDFs BBVA del archivo CONTABILIDAD usando
el script local (pdfplumber, sin API). Llama al script existente en
~/.claude/skills/bbva-estado-cuenta/scripts/import_estado_cuenta_bbva.py
para cada PDF.

Uso:
    python scripts/importar_bbva_local.py
    python scripts/importar_bbva_local.py <directorio>
"""
import os
import sys
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'D:\CONTABILIDAD'
SKILL_SCRIPT = os.path.expanduser(
    '~/.claude/skills/bbva-estado-cuenta/scripts/import_estado_cuenta_bbva.py'
)


def es_bbva_pdf(path):
    """Filtra PDFs que sean estados de cuenta BBVA mensuales."""
    name = os.path.basename(path).upper()
    full = path.upper()
    if not name.endswith('.PDF'):
        return False
    # Path debe contener BBVA o BANCOMER
    if 'BBVA' not in full and 'BANCOMER' not in full:
        return False
    # Excluir reembolsos, comprobantes, auxiliares, dispersión
    excludes = [
        'REEMBOLSO', 'reembolso',
        'COMPROBANTE', 'comprobante',
        'AUXILIAR', 'auxiliar',
        'DISPERSION', 'dispersion',
        'TIPS', 'NOMINA',
        'RELACI', 'CONTABLE',
    ]
    for ex in excludes:
        if ex.upper() in full:
            return False
    return True


def main():
    pdfs = []
    for dirpath, _, files in os.walk(ROOT):
        for f in files:
            full = os.path.join(dirpath, f)
            if es_bbva_pdf(full):
                pdfs.append(full)

    # Dedup por basename para no procesar el mismo archivo en folders diferentes
    seen = set()
    unique = []
    for p in pdfs:
        b = os.path.basename(p).upper()
        if b in seen:
            continue
        seen.add(b)
        unique.append(p)

    print(f'PDFs BBVA encontrados   : {len(pdfs)}')
    print(f'PDFs únicos a procesar  : {len(unique)}')
    print()

    ok = 0
    fail = 0
    for i, pdf in enumerate(unique):
        print(f'\n[{i+1}/{len(unique)}] {os.path.basename(pdf)}', flush=True)
        try:
            res = subprocess.run(
                ['python', SKILL_SCRIPT, pdf],
                capture_output=True, text=True, encoding='utf-8',
                timeout=120,
            )
            if res.returncode == 0:
                ok += 1
                # Mostrar solo líneas clave del output
                for ln in res.stdout.split('\n'):
                    if any(
                        k in ln
                        for k in ('Empresa', 'Insertados:', 'Diff', 'Saldo Final', 'ERROR')
                    ):
                        print(f'  {ln.strip()}')
            else:
                fail += 1
                print(f'  ✗ exit {res.returncode}')
                if res.stderr:
                    print(f'  stderr: {res.stderr[:300]}')
                if res.stdout:
                    err_lines = [
                        l for l in res.stdout.split('\n') if 'ERROR' in l
                    ]
                    for ln in err_lines[:3]:
                        print(f'  {ln.strip()}')
        except subprocess.TimeoutExpired:
            fail += 1
            print(f'  ✗ timeout')
        except Exception as e:
            fail += 1
            print(f'  ✗ exc: {e}')

    print(f'\n=== RESUMEN ===')
    print(f'OK   : {ok}')
    print(f'FAIL : {fail}')


if __name__ == '__main__':
    main()
