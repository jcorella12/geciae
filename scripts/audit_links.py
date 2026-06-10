# -*- coding: utf-8 -*-
import os, re, sys, glob
sys.stdout.reconfigure(encoding='utf-8')

ROOT = 'app'

def norm_path(p):
    return p.replace(os.sep, '/')

# 1. Construir set de rutas válidas desde page.tsx
def page_to_route(path):
    rel = path[len(ROOT):]
    rel = rel.rsplit('/page.', 1)[0]
    parts = []
    for seg in rel.split('/'):
        if not seg:
            continue
        if seg.startswith('(') and seg.endswith(')'):
            continue  # route group
        parts.append(seg)
    return '/' + '/'.join(parts) if parts else '/'

routes = set()
for p in glob.glob('app/**/page.tsx', recursive=True) + glob.glob('app/**/page.js', recursive=True):
    p = norm_path(p)
    routes.add(page_to_route(p))

api_routes = set()
for p in glob.glob('app/**/route.ts', recursive=True) + glob.glob('app/**/route.js', recursive=True):
    p = norm_path(p)
    rel = p[len(ROOT):].rsplit('/route.', 1)[0]
    parts = [s for s in rel.split('/') if s and not (s.startswith('(') and s.endswith(')'))]
    api_routes.add('/' + '/'.join(parts))

print(f"Rutas pagina: {len(routes)}")
print(f"Rutas API: {len(api_routes)}")

def route_to_regex(r):
    pat = []
    for seg in r.split('/'):
        if not seg:
            continue
        if seg.startswith('[...') or seg.startswith('[[...'):
            pat.append('.+')
        elif seg.startswith('['):
            pat.append('[^/]+')
        else:
            pat.append(re.escape(seg))
    return re.compile('^/' + '/'.join(pat) + '$')

route_regexes = [(r, route_to_regex(r)) for r in routes if '[' in r]
static_routes = set(r for r in routes if '[' not in r)
api_regexes = [(r, route_to_regex(r)) for r in api_routes if '[' in r]
api_static = set(r for r in api_routes if '[' not in r)

def matches_route(href):
    h = href.split('?')[0].split('#')[0].rstrip('/')
    if h == '':
        h = '/'
    if h in static_routes or h in api_static:
        return True
    for r, rx in route_regexes:
        if rx.match(h):
            return True
    for r, rx in api_regexes:
        if rx.match(h):
            return True
    return False

link_re = re.compile(r'(?:href|push|replace|redirect|prefetch)\s*[=(]\s*[{]?\s*[`"\']([^`"\']+)[`"\']')

def normalize_template(h):
    return re.sub(r'\$\{[^}]+\}', 'X', h)

broken = {}
all_internal = set()
files_scanned = 0
for base in ['app', 'components', 'lib']:
    for dirpath, _, files in os.walk(base):
        for fn in files:
            if not fn.endswith(('.tsx', '.ts', '.jsx', '.js')):
                continue
            fp = norm_path(os.path.join(dirpath, fn))
            files_scanned += 1
            try:
                with open(fp, encoding='utf-8') as fh:
                    content = fh.read()
            except Exception:
                continue
            for m in link_re.finditer(content):
                href = m.group(1)
                if not href.startswith('/'):
                    continue
                if href.startswith('//'):
                    continue
                if any(href.startswith(p) for p in ['/api/', '/_next/', '/static/', '/images/', '/icons/', '/fonts/']):
                    continue
                if re.search(r'\.(png|jpg|jpeg|svg|ico|webp|css|js|json|woff|woff2|pdf|xml|txt)$', href):
                    continue
                norm = normalize_template(href)
                all_internal.add(norm)
                test = norm.replace('X', 'placeholder123')
                if not matches_route(test):
                    broken.setdefault(norm, set()).add(fp)

print(f"Archivos escaneados: {files_scanned}")
print(f"Enlaces internos unicos: {len(all_internal)}")
print(f"\n=== ENLACES POSIBLEMENTE ROTOS: {len(broken)} ===")
for href in sorted(broken):
    files = broken[href]
    print(f"\n  X {href}")
    for f in sorted(files)[:6]:
        print(f"       {f}")
    if len(files) > 6:
        print(f"       ... y {len(files)-6} mas")
