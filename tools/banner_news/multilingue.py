"""Traducción local opcional (Argos), sin enviar artículos a terceros."""
import os
from pathlib import Path
import re
import threading
from functools import lru_cache

STATE = Path(os.environ.get('LOCALAPPDATA', str(Path.home()/'.local/state'))) / 'SGA-banner'
LOCK = threading.RLock()
INDEX = None
NEW_MODELS = 0
FAILED = set()
ALIASES = {'zh-cn':'zh','zh-tw':'zt','zh-hans':'zh','zh-hant':'zt','iw':'he','in':'id','nb':'no','nn':'no','fil':'tl','ua':'uk'}

def language(text, declared=''):
    raw = str(declared or '').lower().replace('_','-').strip()
    if re.fullmatch(r'[a-z]{2,3}(?:-[a-z0-9]+)*',raw):
        return ALIASES.get(raw, raw.split('-')[0])
    # Una escritura inequívoca permite orientar la detección sin dependencia.
    for pattern, code in [(r'[\u3040-\u30ff]','ja'),(r'[\uac00-\ud7af]','ko'),(r'[\u0e00-\u0e7f]','th'),(r'[\u0980-\u09ff]','bn'),(r'[\u0370-\u03ff]','el'),(r'[\u0590-\u05ff]','he'),(r'[\u4e00-\u9fff]','zh')]:
        if re.search(pattern,text): return code
    try:
        from langdetect import detect, DetectorFactory
        DetectorFactory.seed = 0
        with LOCK:
            raw = detect(text[:1500])
        return ALIASES.get(raw, raw.split('-')[0])
    except Exception:
        return ''


def installed_pairs(package):
    return {(p.from_code,p.to_code) for p in package.get_installed_packages() if hasattr(p,'from_code') and hasattr(p,'to_code')}


def ensure_path(code, package):
    global INDEX, NEW_MODELS
    installed = installed_pairs(package)
    if (code,'es') in installed or {(code,'en'),('en','es')} <= installed: return True
    if not (os.environ.get('SGA_TRANSLATE_LOCAL') == '1' or (STATE/'traduccion-local-activa').is_file()) or code in FAILED: return False
    if INDEX is None:
        package.update_package_index()
        INDEX = {(p.from_code,p.to_code):p for p in package.get_available_packages() if getattr(p,'type','translate') == 'translate' and hasattr(p,'from_code') and hasattr(p,'to_code')}
    paths = [[(code,'es')]]
    if code != 'en': paths.append([(code,'en'),('en','es')])
    choices = [p for p in paths if all(pair in installed or pair in INDEX for pair in p)]
    if not choices:
        FAILED.add(code); return False
    path = min(choices,key=lambda p:sum(pair not in installed for pair in p))
    needed = [p for p in path if p not in installed]
    # Limita descargas iniciales. Los modelos instalados sirven en los siguientes ciclos.
    if NEW_MODELS + len(needed) > 4: return False
    for pair in needed:
        NEW_MODELS += 1
        package.install_from_path(INDEX[pair].download())
    return True

@lru_cache(maxsize=4096)
def translate_es(text, code):
    if code == 'es': return text
    if not code or not text or not (os.environ.get('SGA_TRANSLATE_LOCAL') == '1' or (STATE/'traduccion-local-activa').is_file()): return None
    with LOCK:
        try:
            from argostranslate import package, translate
            if not ensure_path(code,package): return None
            result = translate.translate(text,code,'es')
            if isinstance(result,str) and result.strip() and result.strip() != text.strip(): return result.strip()
        except Exception as exc:
            if code not in FAILED:
                print(f'Traducción local {code}: {type(exc).__name__}',flush=True)
            FAILED.add(code)
        return None
