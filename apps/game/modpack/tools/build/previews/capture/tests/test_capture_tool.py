from __future__ import absolute_import, division, print_function, unicode_literals

import collections
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
TOOLS_DIR = os.path.dirname(BUILD_DIR)
for path in (BUILD_DIR, TOOLS_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

from previews.capture import (  # noqa: E402
    CaptureError,
    capture_ids,
    fit_box,
    image_users,
    latest_shots,
    parse_crops,
    preview_image,
    scaled_box,
    shot_id,
    switch_preview,
)
from previews.states import HUD_PREVIEWS, MODPACK_DIR  # noqa: E402

try:
    import PIL  # noqa: F401
    HAVE_PILLOW = True
except ImportError:
    HAVE_PILLOW = False

CATALOG_PATH = os.path.join(MODPACK_DIR, 'catalog', 'catalog.json')
CROPS_PATH = os.path.join(MODPACK_DIR, 'catalog', 'previews', 'capture.json')
SCREEN = [1920, 1080]
# The last section of CAPTURE.md: nothing to show on a still frame.
KEPT_DRAWN = ('core', 'companion', 'ui', 'replay_upload', 'responsive_reticle')
CATALOG = """{
  "presets": [{ "id": "minimap" }],
  "components": [
    {
      "id": "core",
      "preview": { "image": "previews/base.svg" }
    },
    {
      "id": "companion",
      "preview": { "image": "previews/base.svg" }
    },
    {
      "id": "minimap",
      "preview": {
        "image": "previews/minimap.svg"
      }
    }
  ]
}
"""


def crops(entries, screen=None):
    return {'screen': screen or SCREEN, 'crops': entries}


def read_text(path):
    with io.open(path, encoding='utf-8') as handle:
        return handle.read()


class ParseCropsTest(unittest.TestCase):

    def test_reads_a_box_on_the_reference_screen(self):
        _, parsed = parse_crops(crops({'minimap': {'box': [1380, 540, 540, 540]}}))

        self.assertEqual(parsed['minimap'].box, (1380, 540, 540, 540))

    def test_a_null_box_is_the_whole_screen(self):
        _, parsed = parse_crops(crops({'camera': {'box': None}}))

        self.assertIsNone(parsed['camera'].box)

    def test_keeps_the_file_order(self):
        entries = collections.OrderedDict([('minimap', {'box': None}), ('camera', {'box': None})])

        _, parsed = parse_crops(crops(entries))

        self.assertEqual(list(parsed), ['minimap', 'camera'])

    def test_returns_the_reference_screen(self):
        screen, _ = parse_crops(crops({}))

        self.assertEqual(screen, (1920, 1080))

    def test_refuses_a_box_outside_the_screen(self):
        with self.assertRaises(CaptureError):
            parse_crops(crops({'minimap': {'box': [1800, 0, 400, 300]}}))

    def test_refuses_a_box_without_four_numbers(self):
        with self.assertRaises(CaptureError):
            parse_crops(crops({'minimap': {'box': [0, 0, 400]}}))

    def test_refuses_an_empty_box(self):
        with self.assertRaises(CaptureError):
            parse_crops(crops({'minimap': {'box': [0, 0, 0, 300]}}))

    def test_refuses_a_name_that_is_not_a_component_id(self):
        with self.assertRaises(CaptureError):
            parse_crops(crops({'../minimap': {'box': None}}))

    def test_refuses_a_missing_screen(self):
        with self.assertRaises(CaptureError):
            parse_crops({'crops': {}})


class ShotNameTest(unittest.TestCase):

    def test_reads_the_id_and_the_client_number(self):
        self.assertEqual(shot_id('otmetki_notification_filter_012.png'), ('notification_filter', 12))

    def test_reads_an_id_with_digits(self):
        self.assertEqual(shot_id('otmetki_comp7_helper_003.png'), ('comp7_helper', 3))

    def test_reads_a_shot_without_a_number(self):
        self.assertEqual(shot_id('otmetki_crew_xp.jpg'), ('crew_xp', 0))

    def test_ignores_the_stock_screenshots(self):
        self.assertIsNone(shot_id('shot_086.jpg'))

    def test_takes_the_newest_shot_of_each_id(self):
        names = ['otmetki_minimap_002.png', 'otmetki_minimap_010.png', 'shot_001.jpg', 'otmetki_camera_001.png']

        self.assertEqual(latest_shots(names), {
            'minimap': 'otmetki_minimap_010.png',
            'camera': 'otmetki_camera_001.png',
        })


class FitBoxTest(unittest.TestCase):

    def test_scales_the_box_to_the_shot_resolution(self):
        self.assertEqual(scaled_box((960, 540, 480, 270), (1920, 1080), (3840, 2160)), (1920, 1080, 960, 540))

    def test_a_null_box_spans_the_whole_shot(self):
        self.assertEqual(scaled_box(None, (1920, 1080), (2560, 1440)), (0, 0, 2560, 1440))

    def test_widens_a_tall_box_around_its_centre(self):
        self.assertEqual(fit_box((800, 200, 320, 360), (1920, 1080)), (640, 200, 1280, 560))

    def test_heightens_a_wide_box_around_its_centre(self):
        self.assertEqual(fit_box((0, 400, 1600, 100), (1920, 1080)), (0, 0, 1600, 900))

    def test_moves_the_grown_box_inside_the_image(self):
        self.assertEqual(fit_box((1380, 540, 540, 540), (1920, 1080)), (960, 540, 1920, 1080))

    def test_a_box_too_tall_for_the_image_takes_its_largest_16_9_area(self):
        self.assertEqual(fit_box((0, 0, 400, 1080), (1920, 1080)), (0, 0, 1920, 1080))


class SwitchPreviewTest(unittest.TestCase):

    def test_points_the_entry_at_the_png(self):
        text, _ = switch_preview(CATALOG, 'minimap', preview_image('minimap'))

        self.assertIn('"image": "previews/minimap.png"', text)

    def test_returns_the_image_it_replaced(self):
        _, old = switch_preview(CATALOG, 'minimap', preview_image('minimap'))

        self.assertEqual(old, 'previews/minimap.svg')

    def test_changes_nothing_but_the_image(self):
        text, _ = switch_preview(CATALOG, 'minimap', preview_image('minimap'))

        self.assertEqual(text.replace('minimap.png', 'minimap.svg'), CATALOG)

    def test_changes_only_the_named_entry_of_a_shared_image(self):
        text, _ = switch_preview(CATALOG, 'companion', preview_image('companion'))

        self.assertEqual(image_users(text, 'previews/base.svg'), 1)

    def test_skips_a_preset_with_the_same_id(self):
        text, _ = switch_preview(CATALOG, 'minimap', preview_image('minimap'))

        self.assertIn('"presets": [{ "id": "minimap" }]', text)

    def test_refuses_an_unknown_component(self):
        with self.assertRaises(CaptureError):
            switch_preview(CATALOG, 'gun_arc', preview_image('gun_arc'))


class CropFileTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        with io.open(CROPS_PATH, encoding='utf-8') as handle:
            cls.screen, cls.crops = parse_crops(json.load(handle, object_pairs_hook=collections.OrderedDict))
        with io.open(CATALOG_PATH, encoding='utf-8') as handle:
            entries = json.load(handle)['components']
        cls.components = [entry['id'] for entry in entries if 'kind' not in entry]

    def test_every_crop_names_a_catalog_component(self):
        self.assertEqual([name for name in self.crops if name not in self.components], [])

    def test_every_component_is_drawn_by_the_hud_page_captured_or_kept_drawn(self):
        covered = set(HUD_PREVIEWS) | set(self.crops) | set(KEPT_DRAWN)

        self.assertEqual(sorted(set(self.components) - covered), [])

    def test_no_crop_names_a_preview_the_hud_page_draws(self):
        self.assertEqual(capture_ids(self.crops, HUD_PREVIEWS), list(self.crops))

    def test_every_crop_switches_its_own_catalog_entry(self):
        text = read_text(CATALOG_PATH)

        for component_id in self.crops:
            replaced, _ = switch_preview(text, component_id, preview_image(component_id))
            self.assertEqual(image_users(replaced, preview_image(component_id)), 1, component_id)


@unittest.skipUnless(HAVE_PILLOW, 'Pillow (tools/requirements.txt) is missing')
class RenderTest(unittest.TestCase):

    def setUp(self):
        from PIL import Image

        self.directory = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.directory, True)
        self.shot = os.path.join(self.directory, 'otmetki_minimap_001.png')
        Image.new('RGB', (2560, 1440), (40, 90, 160)).save(self.shot)

    def test_renders_the_crop_at_the_preview_size(self):
        from previews.capture.__main__ import PREVIEW_SIZE, render

        image = render(self.shot, (1380, 540, 540, 540), (1920, 1080), 256)

        self.assertEqual(image.size, PREVIEW_SIZE)

    def test_packs_the_preview_into_a_palette(self):
        from previews.capture.__main__ import render

        image = render(self.shot, None, (1920, 1080), 256)

        self.assertEqual(image.mode, 'P')


if __name__ == '__main__':
    unittest.main()
