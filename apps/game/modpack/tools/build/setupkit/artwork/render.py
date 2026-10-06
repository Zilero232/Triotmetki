"""The catalog's preview images, rendered with resvg (tools/build/rasterize, on Node) and packed with Pillow.

    catalog/previews/*.svg (or a .png screenshot)  -> previews/<component id>.png, 640x360

Every preview is drawn on one 640x360 canvas (16:9, the manager's card frame) with the bundled Fira Sans
(catalog/fonts, OFL), never the system fonts, so a Linux release runner draws the same Cyrillic as Windows.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os

import fileio
import rasterize

from .. import CATALOG_DIR

PREVIEW_SIZE = (640, 360)
PREVIEW_FONT = 'Fira Sans'
FONTS_DIR = os.path.join(CATALOG_DIR, 'fonts')


class ArtworkError(RuntimeError):
    pass


def _image_module():
    try:
        from PIL import Image
    except ImportError as error:
        raise ArtworkError('artwork needs Pillow (python -m pip install -r tools/requirements.txt): %s' % error)
    return Image


def _svg_job(svg_path):
    return rasterize.job(
        rasterize.read_svg(svg_path),
        PREVIEW_SIZE[0],
        font_dirs=[FONTS_DIR],
        font_family=PREVIEW_FONT,
        resources_dir=os.path.dirname(os.path.abspath(svg_path)),
    )


def svg_pngs(svg_paths):
    """The PNG bytes of every SVG at the preview width, drawn in one Node run."""
    if not svg_paths:
        return []
    try:
        return rasterize.svg_pngs([_svg_job(path) for path in svg_paths])
    except rasterize.RasterizeError as error:
        raise ArtworkError('%s' % error)


def cover(image, size, image_module):
    """Scales `image` to cover `size` and crops the overflow evenly from both sides."""
    width, height = size
    scale = max(float(width) / image.width, float(height) / image.height)
    scaled_size = (max(width, int(round(image.width * scale))), max(height, int(round(image.height * scale))))
    image = image.resize(scaled_size, image_module.LANCZOS)
    left = (image.width - width) // 2
    top = (image.height - height) // 2
    return image.crop((left, top, left + width, top + height))


def _is_svg(source):
    return source.lower().endswith('.svg')


def render_all(pairs):
    """Every (source, out path): an SVG renders at 640 px wide (all of them in one Node run), a PNG screenshot is scaled
    and centre-cropped to 640x360. Returns the written paths."""
    Image = _image_module()
    svgs = [source for source, _ in pairs if _is_svg(source)]
    drawn = dict(zip(svgs, svg_pngs(svgs)))
    for source, out_path in pairs:
        image = Image.open(io.BytesIO(drawn[source])) if _is_svg(source) else Image.open(source)
        image = cover(image.convert('RGB'), PREVIEW_SIZE, Image)
        fileio.make_dirs(os.path.dirname(out_path))
        image.save(out_path, format='PNG', optimize=True)
    return [out_path for _, out_path in pairs]


def render_preview(source, out_path):
    return render_all([(source, out_path)])[0]


def render_previews(manifest, catalog, assets_dir, out_dir):
    """Every component preview at the manifest's path under out_dir; returns the written paths."""
    pairs = []
    for component in manifest.components:
        if not component.preview.image:
            continue
        source = os.path.join(assets_dir, catalog.entry(component.id).preview.image)
        pairs.append((source, os.path.join(out_dir, *component.preview.image.split('/'))))
    return render_all(pairs)
