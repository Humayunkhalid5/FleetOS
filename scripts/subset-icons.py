#!/usr/bin/env python3
"""Build a small Material Symbols font containing only the icons FleetOS uses.

The full variable font is ~4 MB; the subset is a few hundred KB. Run this
after adding a new icon name anywhere in client/src or admin/src:

    pip install fonttools brotli
    npm run icons
"""
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'client' / 'node_modules' / 'material-symbols' / 'material-symbols-outlined.woff2'
TARGET = ROOT / 'client' / 'src' / 'assets' / 'fonts' / 'material-symbols-outlined.woff2'
SCAN = [ROOT / 'client' / 'src', ROOT / 'admin' / 'src', ROOT / 'server' / 'src' / 'config']

if not SOURCE.exists():
    sys.exit(f'Missing {SOURCE}. Run "npm --prefix client install" first.')

glyphs = set(TTFont(SOURCE).getGlyphOrder())
tokens = set()
for folder in SCAN:
    for file in folder.rglob('*'):
        if file.suffix in {'.js', '.jsx', '.ts', '.tsx', '.html'} and file.is_file():
            tokens.update(re.findall(r'[a-z][a-z0-9_]{1,40}', file.read_text(encoding='utf-8', errors='ignore')))

used = sorted(token for token in tokens if token in glyphs)
keep = used + [f'{name}.fill' for name in used if f'{name}.fill' in glyphs]

options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
options.layout_closure = False  # keep only ligatures for the icons listed
options.notdef_outline = True
options.name_IDs = ['*']
options.drop_tables = []

font = TTFont(SOURCE)
subsetter = subset.Subsetter(options)
subsetter.populate(glyphs=keep, unicodes=[*range(0x61, 0x7B), *range(0x30, 0x3A), 0x5F, 0x20])
subsetter.subset(font)
TARGET.parent.mkdir(parents=True, exist_ok=True)
font.flavor = 'woff2'
font.save(TARGET)
print(f'{len(used)} icons -> {TARGET.relative_to(ROOT)} ({TARGET.stat().st_size // 1024} KB)')
