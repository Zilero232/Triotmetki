"""The catalog's preview images, rendered with resvg (resvg-py) and packed with Pillow.

    catalog/previews/*.svg (or a .png screenshot)  -> previews/<component id>.png, 640x360

Every preview is drawn on one 640x360 canvas (16:9, the manager's card frame) with the bundled Fira Sans
(catalog/fonts, OFL), never the system fonts, so a Linux release runner draws the same Cyrillic as Windows.
tools/most reuses svg_png, cover and the libraries for its submission sizes.
"""
import io
import os

from .. import CATALOG_DIR

PREVIEW_SIZE = (640, 360)
PREVIEW_FONT = 'Fira Sans'
FONTS_DIR = os.path.join(CATALOG_DIR, 'fonts')


class ArtworkError(RuntimeError):
    pass


def _libraries():
    try:
        import resvg_py
        from PIL import Image
    except ImportError as error:
        raise ArtworkError('artwork needs resvg-py and pillow (uv sync in apps/game/modpack): %s' % error)
    return resvg_py, Image


def svg_png(svg_path, width):
    resvg_py, _ = _libraries()
    return bytes(resvg_py.svg_to_bytes(
        svg_path=svg_path,
        width=width,
        skip_system_fonts=True,
        font_dirs=[FONTS_DIR],
        font_family=PREVIEW_FONT,
        sans_serif_family=PREVIEW_FONT,
    ))


def cover(image, size, image_module):
    """Scales `image` to cover `size` and crops the overflow evenly from both sides."""
    width, height = size
    scale = max(float(width) / image.width, float(height) / image.height)
    scaled_size = (max(width, round(image.width * scale)), max(height, round(image.height * scale)))
    image = image.resize(scaled_size, image_module.LANCZOS)
    left = (image.width - width) // 2
    top = (image.height - height) // 2
    return image.crop((left, top, left + width, top + height))


def render_preview(source, out_path):
    """An SVG renders at 640 px wide; a PNG screenshot is scaled and centre-cropped to 640x360."""
    _, Image = _libraries()
    if source.lower().endswith('.svg'):
        image = Image.open(io.BytesIO(svg_png(source, PREVIEW_SIZE[0])))
    else:
        image = Image.open(source)
    image = cover(image.convert('RGB'), PREVIEW_SIZE, Image)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    image.save(out_path, format='PNG', optimize=True)
    return out_path


def render_previews(manifest, catalog, assets_dir, out_dir):
    """Every component preview at the manifest's path under out_dir; returns the written paths."""
    written = []
    for component in manifest.components:
        if not component.preview.image:
            continue
        source = os.path.join(assets_dir, catalog.entry(component.id).preview.image)
        target = os.path.join(out_dir, *component.preview.image.split('/'))
        written.append(render_preview(source, target))
    return written
