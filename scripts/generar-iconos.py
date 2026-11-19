"""Genera los íconos de Android, el splash y el favicon a partir de dos imágenes
de `assets/images/`:

  - icon.png       el ícono de la app (escudo sobre su fondo). Puede venir con
                   fondo transparente o con esquinas negras alrededor.
  - logo-muni.png  el escudo suelto, con fondo transparente (el mismo que usa
                   `MuniLogo` dentro de la app).

    python -X utf8 scripts/generar-iconos.py [carpeta-vista-previa]

Escribe en `assets/images/`:
  - android-icon-foreground.png  icon.png centrado en la zona segura del ícono
                                 adaptativo (círculo de 66 dp de 108 dp);
  - android-icon-monochrome.png  silueta de logo-muni.png con las líneas
                                 oscuras caladas, para los íconos temáticos
                                 (Android 13+; solo cuenta el canal alfa);
  - splash-icon.png              logo-muni.png recortado al borde;
  - favicon.png                  icon.png a 196 px, para la versión web.
El fondo del ícono adaptativo y del splash es el azul de la marca
(`paleta.marca.secundario`), que pone `app.config.js`. Imprime el `imageWidth`
que necesita el splash en `app.json` para caber en el círculo de 192 dp de
Android 12+.

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
SS = 4  # sobremuestreo de las máscaras geométricas


def mascara_esquinas_negras(rgb):
    """Escudo con esquinas negras (sin transparencia): lo oscuro conectado con
    las esquinas es fondo. Se sustituye por un rectángulo redondeado
    geométrico, metido unos px para quitar el filo oscuro."""
    alto, ancho = rgb.shape[:2]
    oscuro = rgb.max(axis=2) < 60
    fondo = np.zeros_like(oscuro)
    cola = deque([(0, 0), (0, ancho - 1), (alto - 1, 0), (alto - 1, ancho - 1)])
    while cola:
        y, x = cola.popleft()
        if 0 <= y < alto and 0 <= x < ancho and oscuro[y, x] and not fondo[y, x]:
            fondo[y, x] = True
            cola.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))

    escudo = ~fondo
    ys, xs = np.where(escudo)
    top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()

    # Radio de las esquinas, por la diagonal desde la esquina de la caja.
    d = 0
    while not escudo[top + d, left + d]:
        d += 1
    radio = (d * np.sqrt(2)) / (np.sqrt(2) - 1)

    margen = 4
    grande = Image.new("L", (ancho * SS, alto * SS), 0)
    ImageDraw.Draw(grande).rounded_rectangle(
        [(left + margen) * SS, (top + margen) * SS, (right - margen) * SS, (bottom - margen) * SS],
        radius=(radio - margen) * SS,
        fill=255,
    )
    return grande.resize((ancho, alto), Image.LANCZOS)


def cargar_recortado(nombre):
    """La imagen en RGBA, recortada a lo visible y centrada en un cuadrado."""
    imagen = Image.open(ORIGEN / nombre)
    if imagen.mode in ("RGBA", "LA", "P") and np.asarray(imagen.convert("RGBA"))[..., 3].min() < 255:
        rgba = imagen.convert("RGBA")
    else:
        rgba = imagen.convert("RGB").convert("RGBA")
        rgba.putalpha(mascara_esquinas_negras(np.asarray(imagen.convert("RGB")).astype(np.int32)))

    caja = rgba.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    rgba = rgba.crop(caja)
    lado = max(rgba.size)
    cuadrado = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    cuadrado.paste(rgba, ((lado - rgba.width) // 2, (lado - rgba.height) // 2))
    return cuadrado


def extension(imagen):
    """Distancia del centro al píxel visible más lejano, en fracción del lado.
    Es lo que tiene que caber en el círculo seguro."""
    alfa = np.asarray(imagen.getchannel("A")) > 8
    ys, xs = np.nonzero(alfa)
    c = (imagen.width - 1) / 2
    return float(np.sqrt((ys - c) ** 2 + (xs - c) ** 2).max() + 0.5) / imagen.width


def en_lienzo(imagen, lienzo, diametro_seguro):
    """Centra la imagen escalada para que quepa en el círculo seguro."""
    lado_px = int(diametro_seguro / 2 / extension(imagen))
    capa = Image.new("RGBA", (lienzo, lienzo), (0, 0, 0, 0))
    capa.alpha_composite(imagen.resize((lado_px, lado_px), Image.LANCZOS), ((lienzo - lado_px) // 2,) * 2)
    return capa, lado_px


icono = cargar_recortado("icon.png")
logo = cargar_recortado("logo-muni.png")
print(f"icon.png: {icono.width}px, extensión {extension(icono):.3f} del lado")
print(f"logo-muni.png: {logo.width}px, extensión {extension(logo):.3f} del lado")

# 1. Ícono adaptativo: lienzo 108 dp, zona segura = círculo de 66 dp.
LIENZO = 1024
SEGURO = LIENZO * 66 / 108 * 0.96  # 4 % de holgura
frente, lado_icono = en_lienzo(icono, LIENZO, SEGURO)
frente.save(ORIGEN / "android-icon-foreground.png", optimize=True)
print(f"android-icon-foreground.png: ícono de {lado_icono}px en {LIENZO}px")
if lado_icono > icono.width:
    print(f"  [AVISO] icon.png mide {icono.width}px y se amplía a {lado_icono}px: conviene uno más grande.")

# 2. Monocromo: la silueta del escudo con las líneas oscuras (contornos, letras)
# caladas. Se mide por el canal más claro y no por la luminancia: así el rojo
# o el verde cuentan como relleno y solo el negro se cala.
valor = np.asarray(logo.convert("RGB")).astype(np.float32).max(axis=2)
alfa_logo = np.asarray(logo.getchannel("A")).astype(np.float32)
relleno = np.clip((valor - 55) / (110 - 55), 0, 1)
mono = Image.new("RGBA", logo.size, (255, 255, 255, 0))
mono.putalpha(Image.fromarray((alfa_logo * relleno).astype(np.uint8)))
mono_lienzo, _ = en_lienzo(mono, LIENZO, SEGURO)
mono_lienzo.save(ORIGEN / "android-icon-monochrome.png", optimize=True)

# 3. Splash: Expo lo centra en un lienzo de 288 dp con `imageWidth` dp de
# ancho, y Android 12+ lo recorta a un círculo de 192 dp. Se guarda el escudo
# recortado al borde; el tamaño lo fija imageWidth en app.json.
splash = logo.resize((1024, 1024), Image.LANCZOS)
splash.save(ORIGEN / "splash-icon.png", optimize=True)
IMAGE_WIDTH = int(192 * 0.96 / 2 / extension(logo))
print(f"splash-icon.png: imageWidth recomendado = {IMAGE_WIDTH}")

# 4. Favicon de la versión web.
icono.resize((196, 196), Image.LANCZOS).save(ORIGEN / "favicon.png", optimize=True)
print("favicon.png: 196px")


# 5. Vistas previas: ícono con máscara circular y squircle, monocromo, splash.
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
    # Círculo de 192 dp que deja ver Android 12+.
    r = 192 * dp // 4
    cx, cy = pantalla.width // 2, pantalla.height // 2
    ImageDraw.Draw(pantalla).ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 90), width=2)
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
