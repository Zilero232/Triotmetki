"""Renders the PNG files of every asset set from its sources (assets/assets.json `sources` -> `files`).

SVG sources go through resvg (tools/build/rasterize: @resvg/resvg-js on Node), raster sources (a third-party PNG) are
resized with Pillow (LANCZOS).
Each rendition is `<stem><suffix>_<size>.png`; `alpha` scales the opacity (the dimmed pulse frame) and `recolor`
({from: to}) swaps colours in an SVG source before it is drawn (one-colour art in several colours).
The client shows them through Scaleform `img://gui/maps/icons/...` in the HUD labels, which reads PNG
directly: no DDS or atlas is needed (atlases are only for the vanilla battleAtlas, which we never touch).

    python tools/assets/render.py           # rewrite every set's PNG files
    python tools/assets/render.py --check   # fail when a rendition is missing
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'build'))

import asset_sets  # noqa: E402
import fileio  # noqa: E402
import rasterize  # noqa: E402

SOURCE_EXTENSIONS = ('.svg', '.png')


def image_module():
    try:
        from PIL import Image
    except ImportError as error:
        raise SystemExit('render needs Pillow (python -m pip install -r tools/requirements.txt): %s' % error)
    return Image


def rendition_name(stem, rendition):
    return '%s%s_%d.png' % (stem, rendition.get('suffix', ''), rendition['size'])


def svg_text(path, rendition):
    """The SVG source, recoloured first when the rendition asks for it."""
    svg = rasterize.read_svg(path)
    for source, target in sorted((rendition.get('recolor') or {}).items()):
        svg = svg.replace(source, target)
    return svg


def load_image(path, rendition, svg_png):
    Image = image_module()
    if path.endswith('.svg'):
        return Image.open(io.BytesIO(svg_png)).convert('RGBA')
    size = rendition['size']
    return Image.open(path).convert('RGBA').resize((size, size), Image.LANCZOS)


def render_one(path, rendition, svg_png=None):
    image = load_image(path, rendition, svg_png)
    alpha = rendition.get('alpha')
    if alpha is not None:
        image.putalpha(image.getchannel('A').point(lambda value: int(round(value * alpha))))
    output = io.BytesIO()
    image.save(output, 'PNG', optimize=True)
    return output.getvalue()


def render_all(items):
    """{output path: PNG bytes} for the planned items; every SVG is drawn in one Node run."""
    svg_items = [item for item in items if item[1].endswith('.svg')]
    drawn = rasterize.svg_pngs([
        rasterize.job(svg_text(source, rendition), rendition['size']) for _, source, rendition in svg_items
    ])
    svg_pngs = dict((item[0], png) for item, png in zip(svg_items, drawn))
    return dict((output, render_one(source, rendition, svg_pngs.get(output))) for output, source, rendition in items)


def planned(asset_set):
    """(output path, source path, rendition) for every PNG the set's sources make."""
    if not asset_set.sources:
        return []
    source_dir = asset_set.path(asset_set.sources)
    out_dir = asset_set.path(asset_set.files)
    items = []
    for name in sorted(os.listdir(source_dir)):
        stem, extension = os.path.splitext(name)
        if extension.lower() not in SOURCE_EXTENSIONS:
            continue
        source = os.path.join(source_dir, name)
        for rendition in asset_set.renditions:
            items.append((os.path.join(out_dir, rendition_name(stem, rendition)), source, rendition))
    return items


def main(argv):
    is_check = '--check' in argv
    items = [item for asset_set in asset_sets.load() for item in planned(asset_set)]
    stale = []
    for output, data in sorted(render_all(items).items()):
        if not is_check:
            fileio.write_bytes(output, data)
        elif not os.path.isfile(output):
            stale.append(output)
    if stale:
        sys.stderr.write('missing renditions (run tools/assets/render.py):\n  %s\n' % '\n  '.join(stale))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
