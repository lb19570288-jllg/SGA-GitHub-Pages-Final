"""Renovación de las tres colecciones públicas, sin modificar los recursos visuales."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import time
import unicodedata
from html.parser import HTMLParser
from urllib.parse import urlencode, urlsplit, urljoin
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
PERIOD = 15 * 86400
TOPICS = [
    ('agua', 'water conservation', 'Agua'),
    ('energia', 'renewable energy', 'Energía renovable'),
    ('biodiversidad', 'biodiversity conservation', 'Biodiversidad'),
    ('residuos', 'waste recycling', 'Residuos y reciclaje'),
    ('clima', 'climate change adaptation', 'Cambio climático'),
    ('urbano', 'sustainable cities', 'Entorno urbano'),
    ('sociedad', 'environmental education', 'Educación ambiental'),
    ('politica', 'environmental policy', 'Política ambiental'),
]


def safe_url(value):
    if not isinstance(value, str) or not value or len(value) > 2048:
        return ''
    try:
        u = urlsplit(value)
        return value if u.scheme == 'https' and u.hostname and not u.username and not u.password else ''
    except ValueError:
        return ''


def request_json(url, params, key=None):
    headers = {'Accept': 'application/json', 'User-Agent': 'SGA-TecNM-Biblioteca/3.0'}
    if key:
        headers['Authorization'] = 'Bearer ' + key
    req = Request(url + '?' + urlencode(params), headers=headers)
    try:
        with urlopen(req, timeout=20) as response:
            payload = response.read(6_000_001)
            if len(payload) > 6_000_000:
                raise ValueError('respuesta demasiado grande')
            data = json.loads(payload)
            return data if isinstance(data, dict) else {}
    except (OSError, ValueError) as exc:
        print(f'Fuente no disponible: {urlsplit(url).hostname} ({type(exc).__name__})', flush=True)
        return {}


def normalized(text):
    return ' '.join(re.findall(r'[a-z0-9]+', unicodedata.normalize('NFKD', str(text)).encode('ascii','ignore').decode().lower()))


class CoverParser(HTMLParser):
    def __init__(self, title, page):
        super().__init__()
        self.title = normalized(title)
        self.page = page
        self.cover = ''

    def handle_starttag(self, tag, attrs):
        if tag != 'img' or self.cover or not self.title:
            return
        a = dict(attrs)
        alt = normalized(a.get('alt') or '')
        # Exigir identificación expresa de la portada de esta obra, no el logo del sitio.
        if 'portada' not in alt or self.title not in alt:
            return
        for key in ('data-src', 'src'):
            url = safe_url(urljoin(self.page, a.get(key) or ''))
            if url and urlsplit(url).hostname in ('openlibro.com','www.openlibro.com') and re.search(r'/wp-content/uploads/[^?#]+\.(?:jpg|jpeg|png|webp)$', urlsplit(url).path, re.I):
                self.cover = url
                return


def openlibro_cover(record):
    url = safe_url(record.get('url'))
    if not url or urlsplit(url).hostname not in ('openlibro.com','www.openlibro.com'):
        return ''
    try:
        req = Request(url, headers={'User-Agent':'SGA-TecNM-Biblioteca/3.0','Accept':'text/html'})
        with urlopen(req, timeout=8) as r:
            if urlsplit(r.geturl()).hostname not in ('openlibro.com','www.openlibro.com'):
                return ''
            raw = r.read(2_000_001)
            if len(raw)>2_000_000: return ''
        parser = CoverParser(record.get('title') or '', url)
        parser.feed(raw.decode('utf-8','replace'))
        return parser.cover
    except (OSError, ValueError):
        return ''


def book_records(slot, previous, today):
    results, seen = [], set()
    old = {x.get('url') for x in previous if x.get('source') == 'openlibrary'}
    for offset in range(3):
        topic, query, label = TOPICS[(slot * 3 + offset) % len(TOPICS)]
        data = request_json('https://openlibrary.org/search.json', {
            'q': 'subject:(' + query + ')', 'fields': 'key,title,author_name,first_publish_year,cover_i',
            'limit': 24, 'page': 1})
        time.sleep(1.1)
        candidates = []
        for item in data.get('docs', []):
            work = item.get('key', '')
            if not isinstance(work, str) or not re.fullmatch(r'/works/OL\d+W', work):
                continue
            year = item.get('first_publish_year')
            if isinstance(year, int) and year > today.year:
                continue
            url = 'https://openlibrary.org' + work
            if url in seen or not item.get('title'):
                continue
            record = dict(source='openlibrary', title=item['title'], author=', '.join((item.get('author_name') or [])[:5]),
                          year=year, topic=[topic], desc='Registro bibliográfico de Open Library · ' + label + '.', url=url, isbn='')
            cover = item.get('cover_i')
            if isinstance(cover, int) and cover > 0:
                record['cover_id'] = cover
            candidates.append(record)
        candidates.sort(key=lambda x: (x['url'] in old, hashlib.sha256(f'{slot}|{x["url"]}'.encode()).hexdigest()))
        for record in candidates[:4]:
            if record['url'] not in seen:
                results.append(record); seen.add(record['url'])
    return results


def academic_records(slot, kind, previous, today):
    results, seen = [], set()
    old = {x.get('url') for x in previous}
    for offset in range(2):
        _, query, label = TOPICS[(slot * 2 + offset + (3 if kind == 'research' else 0)) % len(TOPICS)]
        search = query if kind == 'research' else query + ' review'
        filters = f'is_oa:true,to_publication_date:{today.isoformat()}'
        if kind == 'research':
            filters += ',type:article'
        data = request_json('https://api.openalex.org/works', {
            'search': search, 'filter': filters, 'per_page': 20,
            'sort': 'publication_date:desc' if kind == 'research' else 'relevance_score:desc',
            'select': 'id,title,publication_year,publication_date,language,authorships,primary_location,best_oa_location,doi,is_retracted',
        }, os.getenv('OPENALEX_API_KEY') or None)
        candidates = []
        for w in data.get('results', []):
            if w.get('is_retracted') or (w.get('publication_date') or '') > today.isoformat():
                continue
            if isinstance(w.get('publication_year'), int) and w['publication_year'] > today.year:
                continue
            primary = w.get('primary_location') or {}; loc = w.get('best_oa_location') or primary
            url = next((v for v in (safe_url(loc.get('landing_page_url')), safe_url(w.get('doi')), safe_url(w.get('id'))) if v), '')
            if not url or url in seen:
                continue
            authors = w.get('authorships') or []
            names = [a.get('author', {}).get('display_name') for a in authors[:5]]
            institutions = list(dict.fromkeys(i.get('display_name') for a in authors[:5] for i in a.get('institutions', []) if i.get('display_name')))
            candidates.append(dict(title=w.get('title') or '', authors=', '.join(n for n in names if n),
                institutions=', '.join(institutions[:4]), source=(primary.get('source') or {}).get('display_name') or 'OpenAlex',
                year=w.get('publication_year'), language=w.get('language') or '', url=url, pdf=safe_url(loc.get('pdf_url')), topic=label))
        candidates.sort(key=lambda x: x['url'] in old)
        for record in candidates[:4]:
            if record['url'] not in seen:
                results.append(record); seen.add(record['url'])
    return results


def update(root=ROOT, force=False, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    slot = int(now.timestamp()) // PERIOD
    path = root / 'data/pages-snapshot/library.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    base = json.loads((root / 'data/library-books.json').read_text(encoding='utf-8'))
    cycles = dict(data.get('collection_slots', {}))
    # El primer despliegue activa el nuevo mecanismo aunque el catálogo anterior
    # se haya generado en la misma quincena.
    for kind in ('books', 'essays', 'research'):
        if not force and cycles.get(kind) == slot:
            continue
        previous = data.get(kind) or []
        if kind == 'books':
            new = book_records(slot, previous, now.date())
            if new:
                original = [b for b in base.get('books', []) if safe_url(b.get('url'))]
                old_books = {b.get('url'): b for b in previous}
                for b in original:
                    if b.get('source') == 'openlibro':
                        cover = openlibro_cover(b) or old_books.get(b['url'], {}).get('cover_url')
                        if cover: b['cover_url'] = cover
                combined = {b['url']: b for b in original + new}
                data[kind] = sorted(combined.values(), key=lambda b: hashlib.sha256(f'{slot}|{b["url"]}'.encode()).hexdigest())
        else:
            new = academic_records(slot, kind, previous, now.date())
            if new:
                data[kind] = new
        if new:
            cycles[kind] = slot
            print(f'{kind}: {len(new)} registros obtenidos', flush=True)
        else:
            print(f'{kind}: se conserva la última edición; se reintentará', flush=True)
    if cycles == data.get('collection_slots') and not force:
        return False
    # Si todas las fuentes fallaron, mantener sin cambios la copia previa.
    if not cycles:
        return False
    data.update(collection_slots=cycles, updated=now.isoformat(), refresh_days=15, slot=slot,
                next_refresh=dt.datetime.fromtimestamp((slot+1)*PERIOD, dt.timezone.utc).isoformat(),
                static_snapshot=True, scheduled_library=True,
                essays_from_previous_cycle=cycles.get('essays') != slot,
                research_from_previous_cycle=cycles.get('research') != slot)
    tmp = path.with_suffix('.tmp'); tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8'); tmp.replace(path)
    return True


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--forzar', action='store_true')
    args = p.parse_args()
    print('Catálogo actualizado.' if update(force=args.forzar) else 'Catálogo sin cambios.')
