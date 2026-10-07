from __future__ import absolute_import, division, print_function, unicode_literals

import os
import shutil
import tempfile
import unittest

import _support  # noqa: F401
from otmetki.companion.capture import capture_ids, chosen_id, next_id, shot_name, stored_current, with_current
from otmetki.companion.capture.client import PreviewCapture, start_capture

INSTALLED = ('minimap', 'camera', 'hangar_cleaner')


class CaptureIdsTest(unittest.TestCase):

    def test_takes_the_listed_ids_in_their_order(self):
        stored = {'ids': ['notification_filter', 'minimap']}

        self.assertEqual(capture_ids(stored, INSTALLED), ('notification_filter', 'minimap'))

    def test_falls_back_to_the_installed_features_sorted(self):
        self.assertEqual(capture_ids({}, INSTALLED), ('camera', 'hangar_cleaner', 'minimap'))

    def test_drops_invalid_and_repeated_ids(self):
        stored = {'ids': ['minimap', '../evil', 7, 'minimap', 'Camera']}

        self.assertEqual(capture_ids(stored, INSTALLED), ('minimap',))

    def test_a_file_that_is_not_an_object_falls_back(self):
        self.assertEqual(capture_ids(['minimap'], INSTALLED), ('camera', 'hangar_cleaner', 'minimap'))


class CaptureChoiceTest(unittest.TestCase):

    def test_keeps_the_stored_current_id(self):
        self.assertEqual(chosen_id(('camera', 'minimap'), 'minimap'), 'minimap')

    def test_an_unknown_current_id_falls_back_to_the_first(self):
        self.assertEqual(chosen_id(('camera', 'minimap'), 'crew_xp'), 'camera')

    def test_no_ids_choose_nothing(self):
        self.assertIsNone(chosen_id((), None))

    def test_next_wraps_around(self):
        self.assertEqual(next_id(('camera', 'minimap'), 'minimap'), 'camera')

    def test_next_steps_forward(self):
        self.assertEqual(next_id(('camera', 'minimap'), 'camera'), 'minimap')

    def test_next_of_an_unknown_id_is_the_first(self):
        self.assertEqual(next_id(('camera', 'minimap'), None), 'camera')

    def test_stored_current_ignores_an_invalid_value(self):
        self.assertIsNone(stored_current({'current': '../x'}))

    def test_with_current_keeps_the_other_keys(self):
        stored = with_current({'note': 'x'}, ('camera',), 'camera')

        self.assertEqual(stored, {'note': 'x', 'ids': ['camera'], 'current': 'camera'})


class ShotNameTest(unittest.TestCase):

    def test_names_the_shot_after_the_component_in_the_screenshots_folder(self):
        self.assertEqual(shot_name('notification_filter'), 'screenshots/otmetki_notification_filter')


class Ui(object):

    def __init__(self):
        self.notes = []

    def notify(self, text):
        self.notes.append(text)


class App(object):

    def __init__(self, config_dir):
        self.config_dir = config_dir
        self.ui = Ui()

    def translate(self, key, **params):
        return '%s %s' % (key, params['component_id'])


class StartCaptureTest(unittest.TestCase):

    def setUp(self):
        self.config_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.config_dir, True)

    def test_a_release_install_gets_no_capture(self):
        self.assertIsNone(start_capture(App(self.config_dir), False))

    def test_a_release_install_writes_no_capture_file(self):
        start_capture(App(self.config_dir), False)

        self.assertEqual(os.listdir(self.config_dir), [])

    def test_picking_the_next_id_saves_it_and_says_so(self):
        app = App(self.config_dir)
        capture = PreviewCapture(app, self.config_dir)
        capture.file.write({'ids': ['camera', 'minimap'], 'current': 'camera'})

        capture.pick_next()

        self.assertEqual(capture.current(), 'minimap')
        self.assertEqual(app.ui.notes, ['capture_target minimap'])


if __name__ == '__main__':
    unittest.main()
