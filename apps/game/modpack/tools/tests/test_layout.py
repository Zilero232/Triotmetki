from __future__ import absolute_import, division, print_function

import importlib
import os
import unittest

import _support
from otmetki.companion.config import DEFAULTS, FEATURES
from otmetki.companion.i18n import STRINGS as COMPANION_STRINGS

FEATURE_FILES = ('model', 'client', 'settings', 'i18n')
HUD_FEATURES = ('battle_progress', 'battle_results', 'damage_log', 'sixth_sense', 'team_hp')
HANGAR_FEATURES = (
    'auto_resupply', 'camera', 'crosshair', 'hangar_cleaner', 'hangar_info', 'hangar_tweaks', 'minimap',
    'notification_filter', 'replay_manager',
)
BATTLE_EXTRAS = ('chat_filter',)
EXPECTED_FEATURES = ('marks_panel', 'replay_upload', 'session_stats') + HUD_FEATURES + HANGAR_FEATURES + BATTLE_EXTRAS
ALLOWED_FLAT_MODULES = ('__init__.py', 'version.py')


def feature_dir(feature_id):
    return os.path.join(_support.FEATURES_DIR, feature_id)


def flat_modules(package_name):
    base = os.path.join(_support.PACKAGES_DIR, package_name)
    return sorted(name for name in os.listdir(base) if name.endswith('.py') and name not in ALLOWED_FLAT_MODULES)


class FeatureLayoutTest(unittest.TestCase):

    def test_features_found(self):
        found = set(_support.feature_ids())

        self.assertEqual(sorted(set(EXPECTED_FEATURES) - found), [], sorted(found))

    def test_every_feature_has_its_concern_packages(self):
        for feature_id in _support.feature_ids():
            base = feature_dir(feature_id)
            self.assertTrue(os.path.isfile(os.path.join(base, '__init__.py')), feature_id)
            for name in FEATURE_FILES:
                is_package = os.path.isfile(os.path.join(base, name, '__init__.py'))
                is_flat_module = os.path.isfile(os.path.join(base, name + '.py'))
                self.assertTrue(is_package, '%s/%s/ must be a package' % (feature_id, name))
                self.assertFalse(is_flat_module, '%s/%s.py: folder per concern' % (feature_id, name))

    def test_every_feature_has_tests_and_an_entry_script(self):
        for feature_id in _support.feature_ids():
            base = feature_dir(feature_id)
            entry = os.path.join(base, 'entry', 'mod_otmetki_%s.py' % feature_id)
            self.assertTrue(os.path.isdir(os.path.join(base, 'tests')), feature_id)
            self.assertTrue(os.path.isfile(entry), entry)

    def test_core_and_companion_have_no_flat_modules(self):
        for name in ('core', 'companion'):
            self.assertEqual(flat_modules(name), [], '%s: one folder per concern' % name)

    def test_feature_descriptor(self):
        for feature_id in _support.feature_ids():
            package = importlib.import_module('otmetki.features.' + feature_id)

            self.assertEqual(package.FEATURE_ID, feature_id)
            self.assertTrue(package.PACKAGE_ID.endswith(feature_id))
            self.assertTrue(callable(package.create))
            self.assertTrue(callable(package.register))

    def test_feature_settings_live_in_the_companion_schema(self):
        for feature_id in _support.feature_ids():
            settings = importlib.import_module('otmetki.features.%s.settings' % feature_id)
            for key in settings.SETTINGS:
                self.assertIn(key, DEFAULTS, '%s: %s' % (feature_id, key))

    def test_feature_strings_do_not_shadow_the_companion(self):
        for feature_id in _support.feature_ids():
            strings = importlib.import_module('otmetki.features.%s.i18n' % feature_id).STRINGS
            for language, entries in strings.items():
                shadowed = sorted(set(entries) & set(COMPANION_STRINGS[language]))
                self.assertEqual(shadowed, [], '%s/%s' % (feature_id, language))

    def test_every_switch_has_a_label(self):
        for language in ('ru', 'en'):
            for key in ('enabled',) + tuple(FEATURES):
                self.assertIn(key, COMPANION_STRINGS[language])


if __name__ == '__main__':
    unittest.main()
