#!/usr/bin/env python3
"""Shrinks the PNG icons (256-colour palettes). Needs Pillow."""
import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
for p in ROOT.glob("icons/*.png"):
    before = p.stat().st_size
    im = Image.open(p).convert("RGBA")
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    q.save(p, optimize=True)
    print(f"{p.relative_to(ROOT)}: {before // 1024} KB -> {p.stat().st_size // 1024} KB")
