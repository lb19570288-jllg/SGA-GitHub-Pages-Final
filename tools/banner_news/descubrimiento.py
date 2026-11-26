"""Lectura de índices públicos del medio, sin APIs de imágenes ni fechas inferidas."""
import json
import re
from urllib.parse import urljoin, urlparse, urlencode, urldefrag
import xml.etree.ElementTree as ET

# Coincidencias de rutas/etiquetas, no una clasificación editorial definitiva.
TOPIC = re.compile(r'environ|ambient|climat|klima|ecolog|ecologi|natur|biodivers|sustain|conserv|green|umwelt|milj|okologie|oekolog|ekolog|medio.ambiente|환경|環境|环境|气候|البيئة|المناخ|эколог|природ|जलवायु|पर्यावरण|পরিবেশ|môi.trường',re.I)
ARCHIVE = re.compile(r'archive|hemerotec|archivo|news|noticias|actualit|artikel|article|posts|ultim|latest|category|rubrik|section|tema|topics|pagina|page/\d',re.I)

def localname(tag): return tag.rsplit('}',1)[-1]
def direct(node, name): return next((e for e in node if localname(e.tag)==name),None)
def val(node, name):
    e=direct(node,name)
    return ''.join(e.itertext()).strip() if e is not None else ''

def sitemap_entries(raw):
    root=ET.fromstring(raw)
    articles, urls, indexes=[],[],[]
    for node in root:
        loc=val(node,'loc')
        if not loc: continue
        if localname(node.tag)=='sitemap':
            indexes.append((loc,val(node,'lastmod'))); continue
        if localname(node.tag)!='url': continue
        news=direct(node,'news')
        if news is not None:
            pub=direct(news,'publication')
            articles.append({'title_original':val(news,'title'),'date':val(news,'publication_date'),'url':loc,'summary':'','language':val(pub,'language') if pub is not None else ''})
        else:
            # lastmod solo ordena candidatos a inspección; jamás es la fecha publicada.
            urls.append((loc,val(node,'lastmod')))
    return articles,urls,indexes

def wordpress_items(raw):
    posts=json.loads(raw)
    if not isinstance(posts,list): return []
    items=[]
    for p in posts:
        if not isinstance(p,dict): continue
        date=p.get('date_gmt')
        if not isinstance(date,str) or not date: continue
        if not re.search(r'(Z|[+-]\d\d:\d\d)$',date): date+='Z'
        title=p.get('title',{}); excerpt=p.get('excerpt',{})
        if not isinstance(title,dict) or not isinstance(excerpt,dict): continue
        items.append({'title_original':title.get('rendered',''),'summary':excerpt.get('rendered',''),'date':date,'url':p.get('link',''),'language':p.get('lang','')})
    return items

def ranked_links(parser, base):
    entries=getattr(parser,'anchors',[]) or [(x,'') for x in parser.links]
    def score(pair):
        url,label=pair; path=urlparse(url).path
        return (int(bool(TOPIC.search(path+' '+label))),int(bool(re.search(r'/20\d\d[/\-]',path))),int(len(path)>35))
    items={}
    for href,label in entries:
        url=urldefrag(urljoin(base,href))[0]
        if url not in items or len(label)>len(items[url]): items[url]=label
    return sorted(items.items(),key=score,reverse=True)

def expand(source, home, base, fetch, html_page, same_site, article_link, add, article_metadata, items, seen):
    """Presupuesto por medio: 2 secciones, 2 REST, 4 mapas, 18 artículos."""
    root=urljoin(base,'/')
    links=ranked_links(home,base) if home else []
    archives=[(u,t) for u,t in links if same_site(u,base) and TOPIC.search(u+' '+t) and (ARCHIVE.search(urlparse(u).path) or len(urlparse(u).path.strip('/').split('/'))<=2)]
    for url,_ in archives[:2]:
        try:
            page,loc=html_page(url)
            if same_site(loc,base): links.extend(ranked_links(page,loc))
        except Exception: pass
    wp_api=getattr(home,'wp_api',None) if home else None
    wp_base=urljoin(base,wp_api) if wp_api else urljoin(root,'wp-json/')
    if same_site(wp_base,base):
        queries=[{'per_page':35,'_fields':'date_gmt,link,title,excerpt,lang','orderby':'date','order':'desc'}]
        if source.get('kind')!='A':
            term='medio ambiente' if source['code'] in {'ES','MX','AR','BO','CL','CO','CR','CU','DO','EC','SV','GT','HN','NI','PA','PY','PE','UY','VE','GQ'} else 'ambiente' if source['code'] in {'BR','PT','AO','CV','GW','MZ','ST'} else 'environnement' if source['code'] in {'FR','BJ','BF','CI','CD','CG','GA','GN','ML','NE','SN','TG'} else 'environment'
            queries.append({**queries[0],'search':term})
        for params in queries[:2]:
            try:
                api=urljoin(wp_base.rstrip('/')+'/', 'wp/v2/posts')+'?'+urlencode(params)
                raw,loc=fetch(api)
                if same_site(loc,base):
                    for item in wordpress_items(raw): add(item)
            except Exception: pass
    maps=[]
    try:
        raw,loc=fetch(urljoin(root,'robots.txt'))
        if same_site(loc,base): maps.extend(re.findall(r'^Sitemap:\s*(\S+)',raw.decode('utf-8','replace'),re.I|re.M))
    except Exception: pass
    maps.extend(urljoin(root,p) for p in ('news-sitemap.xml','sitemap_index.xml','sitemap.xml','wp-sitemap.xml'))
    visited=set(); generic=[]
    while maps and len(visited)<4:
        url=maps.pop(0)
        if url in visited or not same_site(url,base): continue
        visited.add(url)
        try:
            raw,loc=fetch(url)
            if not same_site(loc,base): continue
            news,urls,indexes=sitemap_entries(raw)
            for item in news: add(item)
            generic.extend(urls)
            children=sorted(indexes,key=lambda t:(bool(re.search(r'news|post|article|actualit|noticia',t[0],re.I)),t[1]),reverse=True)
            maps=[u for u,_ in children[:3]]+maps
        except Exception: pass
    # Inspección de artículos de secciones y mapas. No se deduce fecha de ruta ni lastmod.
    links.extend((u,'') for u,_ in sorted(generic,key=lambda x:x[1],reverse=True)[:35])
    unique={}
    for url,text in links:
        if article_link(url,source) and url not in seen and (len(urlparse(url).path.strip('/'))>=12 or urlparse(url).query): unique.setdefault(url,text)
    ranked=sorted(unique,key=lambda u:(bool(TOPIC.search(u+' '+unique[u])),bool(re.search(r'/20\d\d[/\-]',urlparse(u).path)),len(urlparse(u).path)),reverse=True)
    for url in ranked[:18]:
        try:
            page,loc=html_page(url)
            add(article_metadata(page,loc,source))
        except Exception: pass
