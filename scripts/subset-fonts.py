#!/usr/bin/env python3
"""Subset the site's web fonts into a small preloaded core and an on-demand
extended layer. Run manually (not part of the build) after changing a source
font, or when content starts using characters outside the current subsets:

    python3 -m pip install fonttools brotli
    python3 scripts/subset-fonts.py

Then paste the printed `unicode-range` values into `app/layout.tsx`. It also
writes a static TTF used by the Open Graph images (`app/_og.tsx`).

Each font keeps: the site's non-CJK characters, Latin-1 Supplement and Latin
Extended-A. CJK text is left to system fonts (see `--font-zh`).
  - core: ASCII plus common typographic punctuation, preloaded on every page.
  - ext:  everything else; the browser only downloads it when a page uses one
          of its characters (`unicode-range`).
Variable axes are reduced to what the CSS uses, unused OpenType features and
hinting are dropped.
"""

import glob
import io
import os

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'app', '_fonts')
OUT = os.path.join(SRC, 'subset')

# Features the site uses: browser defaults, `--font-features` in globals.css
# (also applied to code), `tabular-nums`, and the project logo labels
# (`dlig`, `cv05`, `cv09` in components/project-logos.tsx).
FEATURES = [
    'kern', 'liga', 'clig', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'rlig',
    'rvrn', 'cpsp', 'cv01', 'cv03', 'cv04', 'cv05', 'cv09', 'ss03', 'dlig',
    'ordn', 'tnum',
]

FONTS = [
    # (output name, source file, axis instancing, rename family to)
    ('inter', 'InterVariable.woff2', {'opsz': (20, 32), 'wght': (400, 700)}, None),
    # Lora's OFL reserves the name "Lora": a modified (subset) copy must not
    # use it, so rename the family inside the font file.
    ('lora-italic', 'LoraItalicVariable.woff2', {'wght': (480, 640)}, ('Lora', 'Shud Serif')),
    ('iosevka', 'IosevkaFixedCurly-ExtendedMedium.woff2', None, None),
]

ASCII = set(range(0x20, 0x7F))
# Non-ASCII characters used on most pages: keep them in the core so typical
# pages never need the extended file.
CORE_EXTRA = {
    0x00A0,          # no-break space
    0x2010,          # hyphen, used by `hyphens: auto`
    0x2013, 0x2014,  # – —
    0x2018, 0x2019,  # ‘ ’
    0x201C, 0x201D,  # “ ”
    0x2026,          # …
}
LATIN_1 = set(range(0xA0, 0x100))
LATIN_EXT_A = set(range(0x100, 0x180))


def site_characters():
    chars = set()
    patterns = ['app/**/*.mdx', 'app/**/*.tsx', 'app/**/*.ts', 'components/**/*.tsx', 'mdx-components.tsx']
    for pattern in patterns:
        for path in glob.glob(os.path.join(ROOT, pattern), recursive=True):
            with open(path, encoding='utf-8') as f:
                chars |= {ord(c) for c in f.read()}
    # Skip control characters and CJK (rendered by system fonts).
    return {c for c in chars if c >= 0x20 and c < 0x2E80}


def to_unicode_range(codepoints):
    ranges, start, prev = [], None, None
    for c in sorted(codepoints):
        if start is None:
            start = prev = c
        elif c == prev + 1:
            prev = c
        else:
            ranges.append((start, prev))
            start = prev = c
    if start is not None:
        ranges.append((start, prev))
    return ', '.join(
        f'U+{a:04X}' if a == b else f'U+{a:04X}-{b:04X}' for a, b in ranges
    )


def build(source, unicodes, instance, rename, flavor='woff2'):
    # lazy=False avoids a fontTools issue subsetting gvar from WOFF2.
    font = TTFont(os.path.join(SRC, source), lazy=False)

    options = subset.Options()
    options.layout_features = FEATURES
    options.hinting = False
    options.notdef_outline = True
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
    options.name_languages = [0x409]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)

    # Instance after subsetting (instancing first breaks gvar subsetting).
    if instance:
        font = instancer.instantiateVariableFont(font, instance)

    if rename:
        old, new = rename
        for record in font['name'].names:
            if record.nameID in (1, 3, 4, 6, 16, 17):
                text = record.toUnicode().replace(old, new)
                if record.nameID == 6:
                    text = text.replace(' ', '')
                record.string = text

    font.flavor = flavor
    buffer = io.BytesIO()
    font.save(buffer)
    covered = set(font.getBestCmap().keys())
    return buffer.getvalue(), covered


def main():
    os.makedirs(OUT, exist_ok=True)
    wanted = site_characters() | ASCII | CORE_EXTRA | LATIN_1 | LATIN_EXT_A
    core_set = ASCII | CORE_EXTRA
    ext_set = wanted - core_set

    print('Paste into app/layout.tsx:\n')
    for name, source, instance, rename in FONTS:
        before = os.path.getsize(os.path.join(SRC, source))
        for layer, unicodes in (('core', core_set), ('ext', ext_set)):
            data, covered = build(source, unicodes, instance, rename)
            path = os.path.join(OUT, f'{name}-{layer}.woff2')
            with open(path, 'wb') as f:
                f.write(data)
            # Advertise only what the file actually contains, so the browser
            # never downloads a layer for a character it can't draw.
            covered &= unicodes
            print(f'// {name}-{layer}.woff2: {len(data) / 1024:.1f} KB, '
                  f'{len(covered)} chars (source {before / 1024:.1f} KB)')
            print(f"// unicode-range: '{to_unicode_range(covered)}'\n")

    # Static TTF for Open Graph images: `next/og` (Satori) can't read WOFF2 or
    # variable fonts. Titles use Lora Italic at weight 500.
    og_dir = os.path.join(SRC, 'og')
    os.makedirs(og_dir, exist_ok=True)
    data, _ = build('LoraItalicVariable.woff2', wanted, {'wght': 500}, ('Lora', 'Shud Serif'), flavor=None)
    with open(os.path.join(og_dir, 'lora-italic-500.ttf'), 'wb') as f:
        f.write(data)
    print(f'// og/lora-italic-500.ttf: {len(data) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
