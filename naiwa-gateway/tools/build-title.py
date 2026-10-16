"""Outline the eight-character brush title for consistent offline rendering.

Source: Google Fonts Zhi Mang Xing (SIL OFL); eight-glyph source subset in
reference/title-font.ttf. This is an interpretation of collegiate brush
lettering, not an exact reproduction of Tsinghua's handwritten logotype.
"""
from pathlib import Path
import re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[1]
TEXT = '奶蛙职业技术学院'
font = TTFont(ROOT / 'reference/title-font.ttf')
glyphs = font.getGlyphSet()
scale = 100 / font['head'].unitsPerEm
paths, boxes = [], []
for i, char in enumerate(TEXT):
    glyph = glyphs[font.getBestCmap()[ord(char)]]
    pen = SVGPathPen(glyphs)
    glyph.draw(pen)
    bounds = BoundsPen(glyphs)
    glyph.draw(bounds)
    x0, y0, x1, y1 = bounds.bounds
    x = i * 108
    boxes.append((x + x0 * scale, -y1 * scale, x + x1 * scale, -y0 * scale))
    paths.append(f'<path d="{pen.getCommands()}" transform="translate({x} 0) scale({scale} {-scale})"/>')

left = min(b[0] for b in boxes) - 5
top = min(b[1] for b in boxes) - 8
width = max(b[2] for b in boxes) - left + 5
height = max(b[3] for b in boxes) - top + 8
svg = (f'<svg class="brush-title" xmlns="http://www.w3.org/2000/svg" '
       f'viewBox="{left:.3f} {top:.3f} {width:.3f} {height:.3f}" '
       'aria-hidden="true" focusable="false" fill="currentColor">'
       + ''.join(paths) + '</svg>')
markup = f'<span class="sr-only">{TEXT}</span>' + svg
html_path = ROOT / 'dist/index.html'
html = html_path.read_text()
html, h1_count = re.subn(r'(<h1 id="site-title">).*?(</h1>)', lambda m: m[1] + markup + m[2], html, flags=re.S)
html, transition_count = re.subn(r'(<div class="transition-copy">).*?(</div>)', lambda m: m[1] + markup + m[2], html, flags=re.S)
assert h1_count == transition_count == 1
html_path.write_text(html)
(ROOT / 'reference/title-lettering.svg').write_text(svg)
print(f'Outlined {len(TEXT)} glyphs; viewBox {width:.1f} × {height:.1f}')
