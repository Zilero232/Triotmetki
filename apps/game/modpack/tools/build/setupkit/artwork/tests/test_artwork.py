from __future__ import absolute_import, division, print_function, unicode_literals

import glob
import os
import shutil
import struct
import sys
import tempfile
import unittest
from distutils.spawn import find_executable

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

import layout  # noqa: E402
import rasterize  # noqa: E402
from setupkit import ASSETS_DIR, CATALOG_PATH  # noqa: E402
from setupkit.artwork import render  # noqa: E402
from setupkit.manifest import catalog as catalog_module  # noqa: E402
from setupkit.manifest.generate import build_manifest  # noqa: E402

try:
    import PIL  # noqa: F401
    HAVE_LIBRARIES = find_executable(rasterize.NODE) is not None
except ImportError:
    HAVE_LIBRARIES = False

PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'
PREVIEW_PACKAGES = ('core', 'companion', 'marks_panel')


def png_size(path):
    with open(path, 'rb') as handle:
        header = handle.read(24)
    assert header[:8] == PNG_SIGNATURE, path
    return struct.unpack('>II', header[16:24])


def preview_manifest():
    catalog = catalog_module.load(CATALOG_PATH, ASSETS_DIR)
    packages = [package for package in layout.split_packages('root_init.py') if package.key in PREVIEW_PACKAGES]
    manifest, _ = build_manifest(packages, catalog)
    return manifest, catalog


class SourcesTest(unittest.TestCase):

    def test_sources_exist(self):
        sources = glob.glob(os.path.join(ASSETS_DIR, 'previews', '*.svg'))

        self.assertTrue(sources)


@unittest.skipUnless(HAVE_LIBRARIES, 'Pillow (tools/requirements.txt) or Node is missing')
class RenderTest(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp)

    def test_an_svg_preview_renders_at_16_by_9(self):
        source = os.path.join(ASSETS_DIR, 'previews', 'camera.svg')

        preview = render.render_preview(source, os.path.join(self.tmp, 'p.png'))

        self.assertEqual(png_size(preview), render.PREVIEW_SIZE)

    def test_a_png_screenshot_is_cropped_to_16_by_9(self):
        from PIL import Image
        screenshot = os.path.join(self.tmp, 'shot.png')
        Image.new('RGB', (1920, 1200), '#18181b').save(screenshot)

        preview = render.render_preview(screenshot, os.path.join(self.tmp, 'q.png'))

        self.assertEqual(png_size(preview), render.PREVIEW_SIZE)

    def test_previews_land_at_the_manifest_paths(self):
        manifest, catalog = preview_manifest()

        written = render.render_previews(manifest, catalog, ASSETS_DIR, self.tmp)

        images = [component.preview.image for component in manifest.components if component.preview.image]
        self.assertEqual(written, [os.path.join(self.tmp, *image.split('/')) for image in images])
        for path in written:
            self.assertEqual(png_size(path), render.PREVIEW_SIZE)


if __name__ == '__main__':
    unittest.main()
