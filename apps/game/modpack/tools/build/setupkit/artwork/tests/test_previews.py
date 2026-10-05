"""Every catalog preview fills the manager's 16:9 card legibly, and none is left over from a removed component.

The manager shows a preview 240 px wide (the card) or about 270 px (the install wizard), so an SVG preview is drawn on
the 640x360 canvas with text of at least MIN_FONT_SIZE there (about 11 px on the card) in the bundled Fira Sans, and
its artwork reaches the canvas edges instead of floating in the middle.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import shutil
import struct
import sys
import tempfile
import unittest
from distutils.spawn import find_executable
import xml.etree.ElementTree as ElementTree

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

import rasterize  # noqa: E402
from setupkit import CATALOG_DIR, CATALOG_PATH  # noqa: E402
from setupkit.artwork import render  # noqa: E402

try:
    import PIL  # noqa: F401
    HAVE_LIBRARIES = find_executable(rasterize.NODE) is not None
except ImportError:
    HAVE_LIBRARIES = False

SVG_NS = '{http://www.w3.org/2000/svg}'
PREVIEWS_DIR = os.path.join(CATALOG_DIR, 'previews')
MIN_FONT_SIZE = 28
# The share of the canvas the artwork spans, measured against the colour of its top-left corner.
MIN_SPAN = (0.8, 0.7)
REMOVED_COMPONENTS = ('config_backup',)
CANVAS_KEYS = ('width', 'height', 'viewBox')


def preview_files(extension):
    return sorted(name for name in os.listdir(PREVIEWS_DIR) if name.endswith(extension))


def catalog_previews():
    with io.open(CATALOG_PATH, encoding='utf-8') as handle:
        entries = json.load(handle)['components']
    return set(entry['preview']['image'].split('/')[-1] for entry in entries if entry.get('preview', {}).get('image'))


def png_size(path):
    with open(path, 'rb') as handle:
        header = handle.read(24)
    return struct.unpack('>II', header[16:24])


def small_texts(root):
    """(text, font size) of every text run drawn below MIN_FONT_SIZE, or without a font size of its own or inherited."""
    found = []

    def walk(element, inherited):
        size = element.get('font-size', inherited)
        if element.tag in (SVG_NS + 'text', SVG_NS + 'tspan'):
            content = (element.text or '').strip()
            if content and (size is None or float(size) < MIN_FONT_SIZE):
                found.append((content, size))
        for child in element:
            walk(child, size)

    walk(root, None)
    return found


def artwork_span(path):
    """(width, height) share of the canvas covered by pixels that differ from the background corner."""
    from PIL import Image, ImageChops

    image = Image.open(path).convert('RGB')
    background = Image.new('RGB', image.size, image.getpixel((0, 0)))
    box = ImageChops.difference(image, background).point(lambda value: 255 if value > 12 else 0).getbbox()
    if box is None:
        return 0.0, 0.0
    return float(box[2] - box[0]) / image.width, float(box[3] - box[1]) / image.height


class PreviewFilesTest(unittest.TestCase):

    def test_every_preview_belongs_to_a_catalog_entry(self):
        stale = sorted(set(preview_files('.svg') + preview_files('.png')) - catalog_previews())

        self.assertEqual(stale, [])

    def test_no_preview_is_left_from_a_removed_component(self):
        names = set(os.path.splitext(name)[0] for name in os.listdir(PREVIEWS_DIR))

        self.assertEqual(sorted(names.intersection(REMOVED_COMPONENTS)), [])

    def test_every_png_preview_is_16_by_9_at_least_the_preview_size(self):
        wrong = []
        for name in preview_files('.png'):
            width, height = png_size(os.path.join(PREVIEWS_DIR, name))
            if width * 9 != height * 16 or width < render.PREVIEW_SIZE[0]:
                wrong.append((name, width, height))

        self.assertEqual(wrong, [])


class SvgPreviewTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        paths = dict((name, os.path.join(PREVIEWS_DIR, name)) for name in preview_files('.svg'))
        cls.roots = dict((name, ElementTree.parse(path).getroot()) for name, path in paths.items())

    def test_every_svg_is_drawn_on_the_preview_canvas(self):
        expected = (str(render.PREVIEW_SIZE[0]), str(render.PREVIEW_SIZE[1]), '0 0 %d %d' % render.PREVIEW_SIZE)

        canvases = dict((name, tuple(root.get(key) for key in CANVAS_KEYS)) for name, root in self.roots.items())

        wrong = [name for name, canvas in canvases.items() if canvas != expected]

        self.assertEqual(wrong, [])

    def test_every_svg_uses_the_bundled_font(self):
        wrong = [name for name, root in self.roots.items() if root.get('font-family') != render.PREVIEW_FONT]

        self.assertEqual(wrong, [])

    def test_the_bundled_font_has_its_licence(self):
        files = os.listdir(render.FONTS_DIR)

        self.assertIn('OFL.txt', files)
        self.assertTrue([name for name in files if name.endswith('.ttf')])

    def test_every_text_is_legible_on_the_card(self):
        small = dict((name, small_texts(root)) for name, root in self.roots.items())

        self.assertEqual(dict((name, texts) for name, texts in small.items() if texts), {})


@unittest.skipUnless(HAVE_LIBRARIES, 'Pillow (tools/requirements.txt) or Node is missing')
class SvgArtworkTest(unittest.TestCase):

    def test_the_artwork_fills_the_canvas(self):
        directory = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, directory, True)
        narrow = []

        for name in preview_files('.svg'):
            out = render.render_preview(os.path.join(PREVIEWS_DIR, name), os.path.join(directory, name + '.png'))
            span = artwork_span(out)
            if span[0] < MIN_SPAN[0] or span[1] < MIN_SPAN[1]:
                narrow.append((name, round(span[0], 2), round(span[1], 2)))

        self.assertEqual(narrow, [])


if __name__ == '__main__':
    unittest.main()
