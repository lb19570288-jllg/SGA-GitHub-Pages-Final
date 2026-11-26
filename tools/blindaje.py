"""Validación previa al despliegue. Sin dependencias ni consultas a Internet."""
import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAGES = ('index.html', 'pages/aviso-privacidad.html', 'pages/biblioteca.html', 'pages/conoce.html', 'pages/contacto.html', 'pages/educacion.html', 'pages/ejes.html', 'pages/indicadores.html', 'pages/noticias.html', 'pages/participa.html', 'novedades/novedades.html', 'cartelera/cartelera.html')
PUBLIC_EXT = {'.html','.css','.js','.json','.pdf','.jpg','.jpeg','.png','.webp','.svg','.gif','.mp4','.ico','.woff','.woff2','.ttf','.txt','.webm','.avif'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def http(value):
    if not isinstance(value, str): return False
    try:
        u = urlsplit(value)
        return u.scheme in ('http','https') and bool(u.hostname) and not u.username and not u.password
    except ValueError:
        return False


def read(root, name):
    with (root/name).open(encoding='utf-8-sig') as stream:
        return json.load(stream)


def records(data, name, limit):
    require(isinstance(data,list) and 0 < len(data) <= limit, f'{name}: catálogo vacío o fuera de límite')
    for row in data:
        require(isinstance(row,dict) and isinstance(row.get('title'),str) and row['title'].strip() and http(row.get('url')), f'{name}: ficha inválida')


def sources(root):
    rows = read(root,'banner_sga/data/sources.json')
    require(isinstance(rows,list) and len(rows)==195,'Directorio: se requieren 195 medios')
    codes = set()
    for row in rows:
        code = row.get('code','')
        require(re.fullmatch(r'[A-Z]{2}',code) and code not in codes and http(row.get('url')) and row.get('medium') and row.get('country') and re.fullmatch(r'#[0-9A-Fa-f]{6}',row.get('color','')), f'Medio inválido: {code}')
        codes.add(code)
        image = row.get('image')
        if image:
            require(image == f'flags_news/{code}.webp' and (root/'banner_sga'/image).is_file(), f'Bandera inválida: {code}')
        else:
            print(f'AVISO: {code} sin bandera local; el banner conserva su texto.')
    return codes


def banner(root, strict=False):
    codes = sources(root)
    data = read(root,'banner_sga/data/destacadas.json')
    rows = data.get('items')
    require(isinstance(rows,list) and len(rows)<=195, 'Banner: catálogo inválido')
    seen=set()
    for row in rows:
        code=row.get('code')
        require(code in codes and code not in seen and isinstance(row.get('title'),str) and row['title'].strip() and http(row.get('url')) and isinstance(row.get('date'),str) and row.get('type') in ('national','un','nature'), f'Banner: noticia inválida {code}')
        if strict:
            require(row.get('translation_status') in ('spanish','translated'),f'Banner: titular sin traducción validada {code}')
        seen.add(code)
    status=read(root,'banner_sga/data/status.json')
    require(status.get('attempted')==195 and status.get('with_headline')==len(rows) and status.get('without_headline')==195-len(rows) and set(status.get('sources',{}))==codes, 'Banner: estado incompleto o inconsistente')
    print(f'Banner: 195 medios; {len(rows)} titulares y {195-len(rows)} enlaces de respaldo')


def library(root):
    data=read(root,'data/pages-snapshot/library.json')
    for name in ('books','essays','research'):
        records(data.get(name), 'Biblioteca/'+name, 500)
    print('Biblioteca: '+', '.join(f'{len(data[k])} {k}' for k in ('books','essays','research')))


class Links(HTMLParser):
    def __init__(self, root, page):
        super().__init__(); self.root=root; self.page=page; self.count=0
    def handle_starttag(self, tag, attrs):
        for key,value in attrs:
            if key not in ('src','href','poster','data') or not value or value.startswith(('#','data:','javascript:','mailto:','tel:')): continue
            u=urlsplit(value)
            if u.scheme or u.netloc or not u.path: continue
            require(not u.path.startswith('/'),f'Ruta absoluta incompatible con repositorio Pages: {self.page.name}: {value}')
            dest=(self.page.parent/unquote(u.path)).resolve()
            require(dest.is_relative_to(self.root) and dest.exists(),f'Recurso local faltante: {self.page.relative_to(self.root)} → {value}')
            self.count+=1


def all_site(root):
    root=root.resolve()
    for p in PAGES: require((root/p).is_file(),f'Falta página esencial: {p}')
    size=0; count=0; links=0
    for p in root.rglob('*'):
        require(not p.is_symlink(),f'Enlace simbólico: {p}')
        if not p.is_file(): continue
        rel=p.relative_to(root)
        require(rel.as_posix()=='.nojekyll' or (p.suffix.lower() in PUBLIC_EXT and not any(x.startswith('.') for x in rel.parts)),f'Archivo inesperado en sitio público: {rel}')
        require(not any(x.lower() in ('private','database','adjuntos','api') for x in rel.parts[:-1]),f'Ruta privada: {rel}')
        require(p.stat().st_size < 100*1024**2,f'Archivo individual de 100 MiB o más: {rel}')
        size+=p.stat().st_size; count+=1
        if p.suffix.lower()=='.json': read(root,rel)
        if p.suffix.lower()=='.html':
            parser=Links(root,p); parser.feed(p.read_text(encoding='utf-8-sig')); links+=parser.count
    require(size <= 1024**3, 'Sitio superior al presupuesto de 1 GiB')
    cfg=read(root,'js/api-config.json')
    base=cfg.get('api_base','')
    require(cfg.get('static_pages') is True and (not base or (http(base) and urlsplit(base).scheme=='https' and urlsplit(base).path.endswith('/api/') and not urlsplit(base).query and not urlsplit(base).fragment)), 'Configuración pública de API incorrecta')
    require(set(cfg)<= {'api_base','static_pages'}, 'Configuración pública contiene campos inesperados')
    banner(root); library(root)
    news=read(root,'data/pages-snapshot/news.json'); records(news.get('items'),'Noticias guardadas',500)
    ids={r.get('id') for r in news['items']}
    require(all(i in ids for i in news.get('featured_ids',[])) and len(news.get('featured_ids',[]))<=40,'Noticias: selección de portada incoherente')
    for module in ('novedades','cartelera'):
        data=read(root,f'{module}/datos.json'); rows=data.get('imagenes')
        require(isinstance(rows,list) and len(rows)<=40,f'{module}: catálogo inválido')
        require(data.get('estado')==('activo' if rows else 'vacio'),f'{module}: estado incoherente')
        for row in rows:
            rel=unquote(urlsplit(row['src']).path)
            target=(root/module/rel).resolve()
            require(target.is_relative_to(root/module/'imagenes') and target.is_file() and row['ancho']>0 and row['alto']>0, f'{module}: fotografía inválida {rel}')
    print(f'VALIDADO: {count} archivos, {size/1024**2:.1f} MiB, {links} referencias HTML locales.')


def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--sitio',type=Path,default=ROOT); p.add_argument('--catalogo',choices=('banner','biblioteca'))
    a=p.parse_args()
    try:
        if a.catalogo=='banner': banner(a.sitio,True)
        elif a.catalogo=='biblioteca': library(a.sitio)
        else: all_site(a.sitio)
    except (OSError,ValueError,KeyError,TypeError,AttributeError) as e:
        print('BLOQUEADO:',e,file=sys.stderr); return 1
    return 0

if __name__=='__main__': raise SystemExit(main())
