"""Quita el gancho plateado dibujado en las fotos de ropa (la app ahora dibuja su propio gancho cromado).
Uso: python3 strip_hangers.py <carpeta_imagenes>
El gancho es gris azulado (~207,215,223): se borra todo lo de ese color conectado con la parte de arriba de la foto.
"""
import sys, glob, os
import numpy as np, cv2
from PIL import Image

folder = sys.argv[1]
HC = np.array([207, 215, 223], float)

for f in sorted(glob.glob(os.path.join(folder, "[hm]-*.png"))):
    if "zapatos" in f:
        continue
    im = np.array(Image.open(f).convert("RGBA"))
    rgb, a = im[..., :3].astype(float), im[..., 3]
    if "pantalones" in f:
        # pantalones: gancho recto + pinza (filas 0-191); la pinza cromada de la app tapa la unión con la pretina
        im[:192] = 0
        Image.fromarray(im).save(f, optimize=True)
        print(os.path.basename(f), "pinza")
        continue
    near = (np.linalg.norm(rgb - HC, axis=2) < 36) & (rgb[..., 2] - rgb[..., 0] > 6) & (a > 0)
    near[300:] = False
    n, lab = cv2.connectedComponents(near.astype(np.uint8), connectivity=8)
    keep = list(set(np.unique(lab[:150][near[:150]]).tolist()) - {0})
    kill = np.isin(lab, keep)
    # borde suave (antialias) pegado al gancho
    kill |= cv2.dilate(kill.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & (a < 230)
    im[kill] = 0
    Image.fromarray(im).save(f, optimize=True)
    print(os.path.basename(f), int(kill.sum()))
