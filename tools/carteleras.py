"""Catálogos de Novedades y Cartelera para el sitio estático del SGA."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, urlsplit
from PIL import Image
from blindaje import PUBLIC_EXT, all_site

ROOT = Path(__file__).resolve().parent.parent
MODULOS = ('novedades', 'cartelera')
FORMATOS = {'.jpg': 'JPEG', '.jpeg': 'JPEG', '.png': 'PNG', '.webp': 'WEBP'}
PUBLICOS = ('banner_sga', 'cartelera', 'css', 'data', 'docs', 'img', 'interactive', 'js', 'novedades', 'pages', 'video')


def catalogo(raiz, modulo, usar_git=False, estricto=False):
    imagenes = []
    carpeta = raiz / modulo / 'imagenes'
    for archivo in sorted(carpeta.iterdir()) if carpeta.is_dir() else []:
        formato = FORMATOS.get(archivo.suffix.lower())
        if not formato or archivo.is_symlink() or not archivo.is_file():
            continue
        try:
            with Image.open(archivo) as foto:
                if foto.format != formato:
                    raise ValueError("El formato real no coincide con la extensión")
                ancho, alto = foto.size
                foto.verify()
            if ancho < 1 or alto < 1:
                raise ValueError("Dimensiones inválidas")
            with archivo.open('rb') as contenido:
                huella = hashlib.file_digest(contenido, 'sha256').hexdigest()[:20]
            fecha = int(archivo.stat().st_mtime)
            if usar_git:
                result = subprocess.run(['git', 'log', '-1', '--format=%ct', '--', str(archivo.relative_to(raiz))], cwd=raiz, capture_output=True, text=True, check=True)
                if result.stdout.strip():
                    fecha = int(result.stdout.strip())
            titulo = re.sub(r'\s+', ' ', archivo.stem.replace('_', ' ').replace('-', ' ')).strip()
            titulo = titulo[:1].upper() + titulo[1:] if titulo else 'Noticia ambiental'
            imagenes.append(dict(src='imagenes/' + quote(archivo.name, safe='') + '?v=' + huella, titulo=titulo, modificado=fecha, ancho=ancho, alto=alto))
        except (OSError, ValueError, SyntaxError, Image.DecompressionBombError) as error:
            if estricto:
                raise ValueError(f"Imagen dañada en {modulo}: {archivo.name}: {error}") from error
            print(f'Imagen omitida: {archivo.name}: {error}', flush=True)
    imagenes.sort(key=lambda i: (-i['modificado'], i['src']))
    imagenes = imagenes[:40]
    return dict(estado='activo' if imagenes else 'vacio', mensaje='Noticias activas' if imagenes else 'NO HAY NOTICIAS', imagenes=imagenes)


def serializar(datos):
    return (json.dumps(datos, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def guardar(raiz, modulo, datos):
    ruta = raiz / modulo / 'datos.json'
    temporal = ruta.with_suffix('.json.tmp')
    temporal.write_bytes(serializar(datos))
    temporal.replace(ruta)
    print(f'{modulo}: {len(datos["imagenes"])} imágenes', flush=True)


def publicar(destino, usar_git=True):
    destino = destino.resolve()
    if destino.exists() or destino == ROOT or ROOT in destino.parents:
        raise SystemExit('La carpeta de salida debe ser nueva y estar fuera del sitio.')
    destino.mkdir(parents=True)
    for nombre in PUBLICOS:
        origen = ROOT / nombre
        if not origen.is_dir():
            raise SystemExit(f'Falta carpeta pública: {nombre}')
        for ruta in origen.rglob('*'):
            rel = ruta.relative_to(ROOT)
            if ruta.is_symlink():
                raise SystemExit(f'Enlace simbólico no permitido: {rel}')
            if not ruta.is_file() or any(p.startswith('.') for p in rel.parts):
                continue
            if ruta.suffix.lower() not in PUBLIC_EXT:
                raise SystemExit(f'Archivo no publicable: {rel}')
            salida = destino / rel
            salida.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ruta, salida)
    shutil.copy2(ROOT / 'index.html', destino / 'index.html')
    (destino / '.nojekyll').touch()
    for modulo in MODULOS:
        guardar(destino, modulo, catalogo(ROOT, modulo, usar_git=usar_git, estricto=True))
    print('Sitio público generado:', destino, flush=True)


class ServidorLocal(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        ruta = urlsplit(self.path).path
        for modulo in MODULOS:
            if ruta == f'/{modulo}/datos.json':
                datos = serializar(catalogo(ROOT, modulo))
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', str(len(datos)))
                self.end_headers()
                self.wfile.write(datos)
                return
        super().do_GET()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    grupo = parser.add_mutually_exclusive_group()
    grupo.add_argument('--publicar', type=Path, help='Generar sitio para GitHub Actions en carpeta externa nueva')
    grupo.add_argument('--verificar', action='store_true', help='Verificar una copia temporal sin cambiar el sitio')
    grupo.add_argument('--servir', action='store_true', help='Vista previa local con catálogos en vivo')
    parser.add_argument('--puerto', type=int, default=8001)
    args = parser.parse_args()
    if args.publicar:
        publicar(args.publicar)
    elif args.verificar:
        with tempfile.TemporaryDirectory(prefix='sga-validacion-') as temp:
            destino = Path(temp) / 'sitio'
            publicar(destino, usar_git=False)
            all_site(destino)
    elif args.servir:
        print(f'Vista previa: http://localhost:{args.puerto} (Ctrl+C para cerrar)', flush=True)
        with ThreadingHTTPServer(('127.0.0.1', args.puerto), ServidorLocal) as servidor:
            try:
                servidor.serve_forever()
            except KeyboardInterrupt:
                pass
    else:
        for modulo in MODULOS:
            guardar(ROOT, modulo, catalogo(ROOT, modulo))


if __name__ == '__main__':
    main()
