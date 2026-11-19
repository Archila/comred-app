"""Genera el ícono adaptativo de Android y la imagen del splash a partir de
`assets/images/icon.png` (el escudo de la municipalidad, con o sin esquinas
negras alrededor).

    python -X utf8 scripts/generar-iconos.py [carpeta-vista-previa]

Escribe en `assets/images/`:
  - android-icon-foreground.png  escudo centrado en la zona segura del ícono
                                 adaptativo (círculo de 66 dp de 108 dp);
  - android-icon-monochrome.png  silueta para los íconos temáticos (Android 13+);
  - splash-icon.png              escudo recortado al borde, para el splash.
El fondo de ambos es el azul de la marca (`paleta.marca.secundario`), que pone
`app.config.js`. Imprime el `imageWidth` que necesita el splash en `app.json`
para caber en el círculo de 192 dp de Android 12+.

Con una carpeta como argumento, deja ahí `vista-previa.png` (ícono con máscara
circular y redondeada, monocromo y splash).

Después: `npx expo prebuild --platform android --clean` y reinstalar.
Requiere Pillow y numpy (`pip install pillow numpy`).
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ORIGEN = Path(__file__).resolve().parent.parent / "assets" / "images"
PREVIA = Path(sys.argv[1]) if len(sys.argv) > 1 else None
NAVY = (0x0C, 0x23, 0x4D)

icono = Image.open(ORIGEN / "icon.png").convert("RGB")
rgb = np.asarray(icono).astype(np.int32)
alto, ancho = rgb.shape[:2]

# 1. Fondo negro: lo oscuro conectado con las esquinas (relleno por inundación).
oscuro = rgb.max(axis=2) < 60
fondo = np.zeros_like(oscuro)
cola = deque((y, x) for y, x in [(0, 0), (0, ancho - 1), (alto - 1, 0), (alto - 1, ancho - 1)])
while cola:
    y, x = cola.popleft()
    if 0 <= y < alto and 0 <= x < ancho and oscuro[y, x] and not fondo[y, x]:
        fondo[y, x] = True
        cola.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))

escudo = ~fondo
ys, xs = np.where(escudo)
top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()

# 2. Radio de las esquinas, por la diagonal desde la esquina de la caja.
d = 0
while not escudo[top + d, left + d]:
    d += 1
radio = (d * np.sqrt(2)) / (np.sqrt(2) - 1)
print(f"caja=({left},{top})-({right},{bottom}) radio≈{radio:.0f}")

# 3. Máscara geométrica suavizada (4x), metida unos px para quitar el filo oscuro.
MARGEN, SS = 4, 4
mascara_grande = Image.new("L", (ancho * SS, alto * SS), 0)
ImageDraw.Draw(mascara_grande).rounded_rectangle(
    [(left + MARGEN) * SS, (top + MARGEN) * SS, (right - MARGEN) * SS, (bottom - MARGEN) * SS],
    radius=(radio - MARGEN) * SS,
    fill=255,
)
mascara = mascara_grande.resize((ancho, alto), Image.LANCZOS)

recorte = (left, top, right + 1, bottom + 1)
escudo_rgba = icono.convert("RGBA")
escudo_rgba.putalpha(mascara)
escudo_rgba = escudo_rgba.crop(recorte)
lado = max(escudo_rgba.size)
cuadrado = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
cuadrado.paste(escudo_rgba, ((lado - escudo_rgba.width) // 2, (lado - escudo_rgba.height) // 2))

# Distancia máxima del centro a un punto del escudo, en fracción del lado:
# (lado/2 - r)·√2 + r. Es lo que debe caber en el círculo seguro.
r_rel = (radio - MARGEN) / lado
extension = (0.5 - r_rel) * np.sqrt(2) + r_rel
print(f"extensión desde el centro = {extension:.3f} del lado")


def en_lienzo(imagen, lienzo, diametro_seguro):
    """Centra la imagen escalada para que quepa en el círculo seguro."""
    lado_px = int(diametro_seguro / 2 / extension)
    capa = Image.new("RGBA", (lienzo, lienzo), (0, 0, 0, 0))
    capa.alpha_composite(imagen.resize((lado_px, lado_px), Image.LANCZOS), ((lienzo - lado_px) // 2,) * 2)
    return capa, lado_px


# 4. Ícono adaptativo: lienzo 108 dp, zona segura = círculo de 66 dp.
LIENZO = 1024
SEGURO = LIENZO * 66 / 108 * 0.96  # 4 % de holgura
frente, lado_icono = en_lienzo(cuadrado, LIENZO, SEGURO)
frente.save(ORIGEN / "android-icon-foreground.png", optimize=True)
print(f"android-icon-foreground.png: escudo de {lado_icono}px en {LIENZO}px")

# Monocromo (íconos temáticos de Android 13): el escudo macizo con el dibujo
# y las letras calados. Android usa solo el canal alfa.
lineas = np.asarray(cuadrado.convert("L")).astype(np.float32)
alfa_escudo = np.asarray(cuadrado.getchannel("A")).astype(np.float32)
# Oscuro (línea) -> 0; claro (fondo del escudo) -> 255.
claridad = np.clip((lineas - 70) / (150 - 70), 0, 1)
alfa_mono = (alfa_escudo * claridad).astype(np.uint8)
mono = Image.new("RGBA", cuadrado.size, (255, 255, 255, 0))
mono.putalpha(Image.fromarray(alfa_mono))
mono_lienzo, _ = en_lienzo(mono, LIENZO, SEGURO)
mono_lienzo.save(ORIGEN / "android-icon-monochrome.png", optimize=True)

# 5. Splash: Expo lo centra en un lienzo de 288 dp con `imageWidth` dp de
# ancho, y Android 12+ lo recorta a un círculo de 192 dp. Se guarda el escudo
# recortado al borde; el tamaño lo fija imageWidth en app.json.
splash = cuadrado.resize((1024, 1024), Image.LANCZOS)
splash.save(ORIGEN / "splash-icon.png", optimize=True)
IMAGE_WIDTH = int(192 * 0.96 / 2 / extension)
print(f"splash-icon.png: imageWidth recomendado = {IMAGE_WIDTH}")

# 6. Vistas previas: ícono con máscara circular y squircle, splash, monocromo.
def con_mascara(forma):
    base = Image.new("RGBA", (LIENZO, LIENZO), NAVY + (255,))
    base.alpha_composite(frente)
    m = Image.new("L", (LIENZO * SS, LIENZO * SS), 0)
    # El launcher muestra los 72 dp centrales de los 108.
    v = LIENZO * SS * 18 / 108
    caja = [v, v, LIENZO * SS - v, LIENZO * SS - v]
    if forma == "circulo":
        ImageDraw.Draw(m).ellipse(caja, fill=255)
    else:
        ImageDraw.Draw(m).rounded_rectangle(caja, radius=(caja[2] - caja[0]) * 0.3, fill=255)
    salida = Image.new("RGBA", (LIENZO, LIENZO), (240, 240, 240, 255))
    salida.paste(base, (0, 0), m.resize((LIENZO, LIENZO), Image.LANCZOS))
    return salida.resize((360, 360), Image.LANCZOS)


def vista_splash():
    dp = 3  # 1 dp = 3 px (xxhdpi aprox.)
    pantalla = Image.new("RGBA", (360 * dp // 2, 720 * dp // 2), NAVY + (255,))
    lado_px = IMAGE_WIDTH * dp // 2
    pantalla.alpha_composite(
        splash.resize((lado_px, lado_px), Image.LANCZOS),
        ((pantalla.width - lado_px) // 2, (pantalla.height - lado_px) // 2),
    )
    return pantalla.resize((360, 720), Image.LANCZOS)


def vista_mono():
    fondo_mono = Image.new("RGBA", (LIENZO, LIENZO), (210, 230, 200, 255))
    tinta = Image.new("RGBA", (LIENZO, LIENZO), (40, 70, 30, 255))
    fondo_mono.paste(tinta, (0, 0), mono_lienzo.getchannel("A"))
    return fondo_mono.resize((360, 360), Image.LANCZOS)


if PREVIA is None:
    sys.exit(0)
PREVIA.mkdir(parents=True, exist_ok=True)
hoja = Image.new("RGBA", (360 * 3 + 40 + 360 + 20, 740), (255, 255, 255, 255))
hoja.paste(con_mascara("circulo"), (0, 0))
hoja.paste(con_mascara("squircle"), (380, 0))
hoja.paste(vista_mono(), (760, 0))
hoja.paste(vista_splash(), (1140, 10))
hoja.save(PREVIA / "vista-previa.png")
print("vista previa:", PREVIA / "vista-previa.png")
