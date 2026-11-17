"""Limpia las paredes: quita la baranda (tubo, bridas, ganchos y su sombra) y el piso de cada imagen.
Uso: python3 clean_walls.py <carpeta_origen> <carpeta_destino> [carpeta_debug]
"""
import sys, os
import numpy as np, cv2

src, dst = sys.argv[1], sys.argv[2]
dbg = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(dst, exist_ok=True)

def rail_mask(img):
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    s, v = hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    m = np.zeros((h, w), np.uint8)
    # localiza la fila del tubo: banda horizontal gris (baja saturación) más larga entre 110 y 160
    gray = (s < 70) & (v > 25) & (v < 170)
    rows = gray[:, 180:860].mean(1)
    yc = 110 + int(np.argmax(rows[110:160]))
    cv2.rectangle(m, (150, yc - 6), (895, yc + 8), 255, -1)
    # bridas (3) y la tapa del codo de cada extremo
    for x in (172, 512, 872):
        cv2.circle(m, (x, yc + 1), 19, 255, -1)
    # ganchos colgando del tubo y sombra suave: píxeles grises/oscuros justo debajo
    band = np.zeros_like(m)
    band[yc + 8:yc + 34, 150:895] = 1
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    k7 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    dark = cv2.morphologyEx(g, cv2.MORPH_BLACKHAT, k7) > 9   # trazos finos oscuros (ganchos)
    light = cv2.morphologyEx(g, cv2.MORPH_TOPHAT, k7) > 28    # brillos del metal
    thin = band.astype(bool) & (dark | (light & (s < 70)))
    m[thin] = 255
    m = cv2.dilate(m, np.ones((3, 3), np.uint8), 1)
    return m, yc

for k in ("camisas", "hoodies", "pantalones", "zapatos"):
    img = cv2.imread(os.path.join(src, f"pared-{k}.jpg"))
    h, w = img.shape[:2]
    m, yc = rail_mask(img)
    # relleno por parches (conserva la textura del grafiti mejor que un difuminado)
    out = img.copy()
    cv2.xphoto.inpaint(img, 255 - m, out, cv2.xphoto.INPAINT_FSR_BEST)
    # suaviza la costura del parche con un poco de ruido parecido al grano de la imagen
    noise = np.random.default_rng(1).normal(0, 3.2, out.shape)
    soft = cv2.GaussianBlur(m, (0, 0), 2).astype(float)[..., None] / 255
    out = np.clip(out + noise * soft, 0, 255).astype(np.uint8)
    # piso: filas casi grises al final de la imagen
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    sat = hsv[..., 1].mean(1)
    fy = h
    for y in range(h - 1, h // 2, -1):
        if sat[y] > 60:
            fy = y + 1
            break
    fy -= 2  # quita también la línea de unión pared/piso
    # recorta el piso y los lados en la misma proporción para mantener 2:1 sin deformar
    nw = fy * 2
    x0 = (w - nw) // 2
    out = out[:fy, x0:x0 + nw]
    out = cv2.resize(out, (w, h), interpolation=cv2.INTER_LANCZOS4)
    cv2.imwrite(os.path.join(dst, f"pared-{k}.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(k, "tubo en y=", yc, "piso desde y=", fy, "recorte x0=", x0)
    if dbg:
        cv2.imwrite(os.path.join(dbg, f"mask-{k}.png"), m)
