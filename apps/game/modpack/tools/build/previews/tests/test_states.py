import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from previews.states import HUD_PREVIEWS, MODPACK_DIR, job, own_images, preview_state  # noqa: E402

CATALOG_PATH = os.path.join(MODPACK_DIR, 'catalog', 'catalog.json')
PAGE_WIDGETS = os.path.join(
    MODPACK_DIR, 'ui-web', 'src', 'features', 'hud', 'widget-registry', 'lib', 'widget-registry', 'widget-entries.ts',
)


def image_values(value):
    if isinstance(value, dict):
        return [found for item in value.values() for found in image_values(item)]
    if isinstance(value, list):
        return [found for item in value for found in image_values(item)]
    is_image = isinstance(value, str) and value.startswith('img://')
    return [value] if is_image else []


def catalog_images():
    with open(CATALOG_PATH, encoding='utf-8') as handle:
        entries = json.load(handle)['components']
    return dict((entry['id'], entry.get('preview', {}).get('image')) for entry in entries)


class PreviewStateTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        images = own_images()
        cls.images = images
        states = dict((component_id, preview_state(component_id, images)) for component_id in HUD_PREVIEWS)
        cls.panels = dict((component_id, state['panels'][0]) for component_id, state in states.items())
        with open(PAGE_WIDGETS, encoding='utf-8') as handle:
            cls.page_widgets = handle.read()

    def test_every_hud_preview_is_a_widget_the_page_draws(self):
        kinds = [panel['widget']['kind'] for panel in self.panels.values()]

        missing = [kind for kind in kinds if "kind: '%s'" % kind not in self.page_widgets]

        self.assertEqual(missing, [])

    def test_the_previews_carry_only_images_the_modpack_ships(self):
        paths = [value[len('img://'):].split('|')[0] for panel in self.panels.values() for value in image_values(panel)]

        foreign = [path for path in paths if path not in self.images]

        self.assertEqual(foreign, [])

    def test_the_preview_panel_is_centred_on_the_page(self):
        panel = self.panels['team_hp']

        self.assertEqual((panel['align_x'], panel['align_y'], panel['x'], panel['y']), ('center', 'center', 0, 0))

    def test_the_catalog_shows_the_rendered_preview_of_every_hud_component(self):
        images = catalog_images()

        wrong = [cid for cid in HUD_PREVIEWS if images.get(cid) != 'previews/%s.png' % cid]

        self.assertEqual(wrong, [])

    def test_every_rendered_preview_is_in_the_catalog_folder(self):
        rendered = [os.path.join(MODPACK_DIR, 'catalog', 'previews', cid + '.png') for cid in HUD_PREVIEWS]

        missing = [path for path in rendered if not os.path.isfile(path)]

        self.assertEqual(missing, [])

    def test_the_job_lists_every_hud_component_once(self):
        ids = [preview['id'] for preview in job(self.images)['previews']]

        self.assertEqual(ids, sorted(HUD_PREVIEWS))


if __name__ == '__main__':
    unittest.main()
