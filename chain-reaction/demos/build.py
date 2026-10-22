#!/usr/bin/env python3
"""Builds each demo in src/ into a single self-contained HTML file.

The shared engine, kit and styles are pasted into every demo so each file
works on its own and the engine stays identical across demos.

Usage: python3 build.py [artifact_dir]
With artifact_dir, also writes copies without the outer <html>/<head>/<body>
skeleton, for publishing as claude.ai artifacts.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
PARTS = {
    "/*@ENGINE*/": (SRC / "_engine.js").read_text(),
    "/*@KIT*/": (SRC / "_kit.js").read_text(),
    "/*@KITCSS*/": (SRC / "_kit.css").read_text(),
    "/*@CARDS*/": (SRC / "_cards.js").read_text(),
    "/*@CARDSCSS*/": (SRC / "_cards.css").read_text(),
    "/*@TABLE*/": (SRC / "_table.js").read_text(),
    "/*@STAMPEDE*/": (SRC / "_stampede.js").read_text(),
    "/*@STAMPEDECSS*/": (SRC / "_stampede.css").read_text(),
    "<!--@STAMPEDEHTML-->": (SRC / "_stampede.html").read_text(),
    "/*@STAMPEDE2*/": (SRC / "_stampede2.js").read_text(),
    "/*@STAMPEDE2CSS*/": (SRC / "_stampede2.css").read_text(),
    "<!--@STAMPEDE2HTML-->": (SRC / "_stampede2.html").read_text(),
}
SKELETON = re.compile(
    r"<!doctype html>\s*|<html[^>]*>\s*|</html>\s*|<head>\s*|</head>\s*|<body>\s*|</body>\s*"
    r'|<meta charset="utf-8"\s*/?>\s*|<meta name="viewport"[^>]*>\s*',
    re.I,
)

artifact_dir = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
if artifact_dir:
    artifact_dir.mkdir(parents=True, exist_ok=True)

for src in sorted([*SRC.glob("[0-9]*.html"), *SRC.glob("s[0-9]*.html"), *SRC.glob("n[0-9]*.html")]):
    html = src.read_text()
    for marker, text in PARTS.items():
        html = html.replace(marker, text)
    (ROOT / src.name).write_text(html)
    if artifact_dir:
        (artifact_dir / src.name).write_text(SKELETON.sub("", html))
    print("built", src.name)
