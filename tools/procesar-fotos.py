"""Mejora las fotos reales de Cuca y las exporta a public/img/reales en WebP.

Uso:  python tools/procesar-fotos.py [carpeta_upscaled]
- Toma los originales de fotos-originales/.
- Si existe una versión ampliada con IA (EDSR x4) en carpeta_upscaled/<nombre>.png la usa;
  si no, amplía con FSRCNN (rápido) o Lanczos.
- Aplica un retoque suave (nitidez, contraste, color) y exporta al tamaño de uso.
Requiere: pip install opencv-contrib-python-headless pillow
"""
import os
import sys

from PIL import Image, ImageEnhance, ImageFilter

ORIG = 'fotos-originales'
DEST = 'public/img/reales'
UP = sys.argv[1] if len(sys.argv) > 1 else None
FSRCNN = os.environ.get('FSRCNN_MODEL')  # ruta opcional a FSRCNN_x4.pb

# original -> (nombre final, lado mayor en px)
MAPA = {
    'images (5).jpg': ('picada-real', 1400),
    'images (4).jpg': ('picada-premium-promo', 1300),
    'images (2).jpg': ('miga-triples', 1200),
    'images (13).jpg': ('medialunas-real', 1400),
    'images (14).jpg': ('medialunas-jyq', 1200),
    'images (6).jpg': ('sandwiches-gourmet', 1200),
    'images (11).jpg': ('miga-cuca', 1200),
    'images (3).jpg': ('ilustracion-local', 1200),
    'images (1).jpg': ('queso-ojos', 1200),
    'images (8).jpg': ('queso-atuel', 1200),
    'images (9).jpg': ('queso-sardo', 1200),
    'images (12).jpg': ('quesos-mesonier', 1200),
    'images.jpg': ('prepizzas', 1200),
    'images (7).jpg': ('pizza-muzza', 1200),
    'images (10).jpg': ('miga-letras', 1200),
}

sr = None
if FSRCNN:
    import cv2
    from cv2 import dnn_superres
    sr = dnn_superres.DnnSuperResImpl_create()
    sr.readModel(FSRCNN)
    sr.setModel('fsrcnn', 4)


def ampliar(nombre):
    if UP:
        cand = os.path.join(UP, nombre.replace(' ', '_').replace('.jpg', '.png'))
        if os.path.exists(cand):
            return Image.open(cand).convert('RGB'), 'EDSR'
    if sr is not None:
        import cv2
        import numpy as np
        img = cv2.imread(os.path.join(ORIG, nombre))
        out = sr.upsample(img)
        return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)), 'FSRCNN'
    im = Image.open(os.path.join(ORIG, nombre)).convert('RGB')
    return im.resize((im.width * 4, im.height * 4), Image.LANCZOS), 'Lanczos'


os.makedirs(DEST, exist_ok=True)
for orig, (final, lado) in MAPA.items():
    im, metodo = ampliar(orig)
    esc = lado / max(im.size)
    im = im.resize((round(im.width * esc), round(im.height * esc)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = ImageEnhance.Color(im).enhance(1.08)
    ruta = os.path.join(DEST, final + '.webp')
    im.save(ruta, 'WEBP', quality=82, method=6)
    print(f'{final:22s} {im.size} {metodo:8s} {os.path.getsize(ruta) // 1024} KB')
