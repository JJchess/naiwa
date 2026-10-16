"""Build original seal artwork as outlined SVG; no runtime font dependency.

Requires fontTools and the local Arphic Kaiti / Liberation Serif fonts below.
The output is embedded in index.html. Geometry is independent of animation.
"""
from pathlib import Path
from math import sin, cos, radians, degrees
import re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
FONTS = {
    'zh': TTFont('/usr/share/fonts/truetype/arphic-bkai00mp/bkai00mp.ttf'),
    'en': TTFont('/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'),
}

def point(radius, angle):
    a = radians(angle)
    return 260 + sin(a) * radius, 260 - cos(a) * radius

def glyph(char, kind, size, x, y, rotation=0):
    font = FONTS[kind]
    glyphs = font.getGlyphSet()
    name = font.getBestCmap()[ord(char)]
    scale = size / font['head'].unitsPerEm
    width = glyphs[name].width * scale
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(pen)
    ink = ' stroke="currentColor" stroke-width="10" stroke-linejoin="round"' if kind == 'zh' else ''
    return (f'<path d="{pen.getCommands()}"{ink} transform="translate({x:.3f} {y:.3f}) '
            f'rotate({rotation:.3f}) translate({-width/2:.3f} 0) scale({scale:.7f} {-scale:.7f})"/>'), width

def curved(text, kind, size, radius, spacing, bottom=False):
    font = FONTS[kind]
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    widths = [glyphs[cmap[ord(c)]].width * size / font['head'].unitsPerEm for c in text]
    cursor = -(sum(widths) + spacing * (len(text)-1)) / 2
    paths = []
    for char, width in zip(text, widths):
        a = (cursor + width/2) / radius
        x, y = 260 + sin(a)*radius, 260 + (1 if bottom else -1)*cos(a)*radius
        paths.append(glyph(char, kind, size, x, y, degrees(a)*(-1 if bottom else 1))[0])
        cursor += width + spacing
    return ''.join(paths)

rope = []
for i in range(100):
    a = i * 3.6
    x1, y1 = point(236, a - .7)
    xm, ym = point(244, a + .9)
    x2, y2 = point(250, a + 2.2)
    rope.append(f'<path d="M{x1:.2f} {y1:.2f}Q{xm:.2f} {ym:.2f} {x2:.2f} {y2:.2f}"/>')

fleurons = []
for cx in [47, 473]:
    fleurons.append(f'<g transform="translate({cx} 260)"><path d="M0-14C5-8 5-4 0 0C-5-4-5-8 0-14ZM14 0C8 5 4 5 0 0C4-5 8-5 14 0ZM0 14C-5 8-5 4 0 0C5 4 5 8 0 14ZM-14 0C-8-5-4-5 0 0C-4 5-8 5-14 0Z"/><circle r="2.5" fill="#fbf9fe"/></g>')

ring = f'''<svg class="seal-ring" viewBox="0 0 520 520" preserveAspectRatio="none" focusable="false">
  <g class="portal-spin">
    <circle cx="260" cy="260" r="210" fill="none" stroke="#fbf9fe" stroke-width="78"/>
    <g fill="none" stroke="currentColor">
      <circle cx="260" cy="260" r="251" stroke-width="3.5"/>
      <circle cx="260" cy="260" r="235" stroke-width="3"/>
      <g stroke-width="2.2">{''.join(rope)}</g>
      <circle cx="260" cy="260" r="173" stroke-width="4.5"/>
      <circle cx="260" cy="260" r="165" stroke-width="1.5"/>
    </g>
    <g fill="currentColor" aria-label="清華大學 TSINGHUA UNIVERSITY 1911">
      {curved('清華大學', 'zh', 52, 191, 24)}
      {curved('TSINGHUA UNIVERSITY', 'en', 27, 222, 4.6, True)}
      {curved('1911', 'en', 20, 184, 2, True)}
      {''.join(fleurons)}
    </g>
  </g>
</svg>'''

# A complete eight-sector motto band surrounds the centered gate.
# Symmetry takes precedence over keeping the gate visible beside the mascot.
inscriptions = []
for char, a in zip('自強不息厚德載物', [22.5 + 45*i for i in range(8)]):
    x, y = point(139, a)
    # Offset the baseline in the glyph's rotated coordinate system.
    inscriptions.append(glyph(char, 'zh', 26, x - sin(radians(a))*9, y + cos(radians(a))*9, a)[0])
dividers = []
for a in range(0, 360, 45):
    x1, y1 = point(119, a)
    x2, y2 = point(158, a)
    dividers.append(f'<path d="M{x1:.2f} {y1:.2f}L{x2:.2f} {y2:.2f}"/>')
core = f'''<svg class="seal-core" viewBox="0 0 520 520" preserveAspectRatio="none" focusable="false">
  <g class="portal-spin">
  <g fill="none" stroke="currentColor" stroke-width="2.5">
    <circle cx="260" cy="260" r="158"/>
    <circle cx="260" cy="260" r="119"/>
    <g stroke-width="1.5">{''.join(dividers)}</g>
  </g>
  <g fill="currentColor">{''.join(inscriptions)}</g>
  <g fill="none" stroke="currentColor" stroke-width="9" stroke-linejoin="round" transform="translate(91 100.425) scale(.65)">
    <path d="M139 317V213h65v104m112 0V213h65v104M204 317V187h112v130M131 317h258M124 332h272M132 213h72m112 0h72M196 187h128M210 174h100l-50-23Z"/>
    <path d="M227 317v-62a33 33 0 0 1 66 0v62M158 317v-65a14 14 0 0 1 28 0v65m148 0v-65a14 14 0 0 1 28 0v65"/>
    <path d="M227 205h66M143 226h56m-56 10h56m122-10h56m-56 10h56M139 304h65m112 0h65M218 340h84" stroke-width="4"/>
  </g>
  </g>
</svg>'''

html_path = ROOT / 'dist/index.html'
html = html_path.read_text()
html = re.sub(r'<svg class="seal-core".*?</svg>', lambda _: core, html, flags=re.S)
html = re.sub(r'<svg class="seal-ring".*?</svg>', lambda _: ring, html, flags=re.S)
html_path.write_text(html)
reference = ROOT / 'reference/emblem.svg'
reference.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520" viewBox="0 0 520 520">'
                     '<g color="#805ca2">' + ring + '</g><g color="#a48abb" opacity=".55">' + core + '</g></svg>')
print('Outlined emblem embedded in index.html; standalone vector saved in reference/.')
