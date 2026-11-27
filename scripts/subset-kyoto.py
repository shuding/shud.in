#!/usr/bin/env python3
"""Subset the licensed PP Kyoto fonts the same way as the site's other fonts
(see subset-fonts.py): a small core layer and an on-demand extended layer.

PP Kyoto is a commercial font, so neither the source files nor the subsets are
in this public repository. The subsets live in Vercel Blob at a path only known
to the site's own builds (`KYOTO_FONTS_URL`); see scripts/fetch-fonts.mjs.
Forks don't have that variable and keep the open-source serif.

    python3 -m pip install fonttools brotli
    python3 scripts/subset-kyoto.py <dir with PPKyoto-*.otf> <output dir>

Then upload everything in <output dir> under the `KYOTO_FONTS_URL` prefix.
"""

import importlib.util
import io
import json
import os
import sys

from fontTools.ttLib import TTFont

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location(
    'subset_fonts', os.path.join(HERE, 'subset-fonts.py')
)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

# (output name, source file, CSS font-weight, CSS font-style)
FACES = [
    ('kyoto-regular', 'PPKyoto-Regular.otf', 400, 'normal'),
    ('kyoto-italic', 'PPKyoto-RegularItalic.otf', 400, 'italic'),
    ('kyoto-bold', 'PPKyoto-Bold.otf', 700, 'normal'),
    ('kyoto-bold-italic', 'PPKyoto-BoldItalic.otf', 700, 'italic'),
]


HYPHEN = 0x2010


def map_hyphen(data):
    """Draw U+2010 (the hyphen `hyphens: auto` inserts) with the font's own
    hyphen-minus. Kyoto has no U+2010, so the browser would otherwise fetch
    the fallback serif just for hyphenated words."""
    font = TTFont(io.BytesIO(data))
    for table in font['cmap'].tables:
        if table.isUnicode() and 0x2D in table.cmap:
            table.cmap[HYPHEN] = table.cmap[0x2D]
    out = io.BytesIO()
    font.save(out)
    return out.getvalue()


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    source_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)

    wanted = (
        base.site_characters() | base.ASCII | base.CORE_EXTRA | base.LATIN_1
        | base.LATIN_EXT_A
    )
    core_set = base.ASCII | base.CORE_EXTRA
    ext_set = wanted - core_set

    # `build()` reads from the module's SRC directory.
    base.SRC = source_dir

    manifest = []
    for name, source, weight, style in FACES:
        for layer, unicodes in (('core', core_set), ('ext', ext_set)):
            data, covered = base.build(source, unicodes, None, None)
            if HYPHEN in unicodes and HYPHEN not in covered:
                data = map_hyphen(data)
                covered.add(HYPHEN)
            file = f'{name}-{layer}.woff2'
            with open(os.path.join(out_dir, file), 'wb') as f:
                f.write(data)
            covered &= unicodes
            manifest.append({
                'file': file,
                'weight': weight,
                'style': style,
                'layer': layer,
                'unicodeRange': base.to_unicode_range(covered),
            })
            print(f'{file}: {len(data) / 1024:.1f} KB, {len(covered)} chars')

    with open(os.path.join(out_dir, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
    print('manifest.json')


if __name__ == '__main__':
    main()
