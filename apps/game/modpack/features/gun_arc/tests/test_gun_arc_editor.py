from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.editor import groups_editor
from otmetki.core.settings import Settings
from otmetki.features.gun_arc.i18n import STRINGS
from otmetki.features.gun_arc.model.constants import EDITOR_GROUPS
from otmetki.features.gun_arc.settings import ADVANCED, SCHEMA

PANEL_KEYS = ('x', 'y', 'align_x', 'align_y', 'drag', 'scale', 'alpha', 'font_size', 'border')


def spec():
    return groups_editor('gun_arc', EDITOR_GROUPS)(Settings(None, SCHEMA), lambda key, **params: key)


def grouped_keys():
    return [key for group in spec()['groups'] for key in group['keys']]


class EditorTest(unittest.TestCase):

    def test_groups_name_only_schema_keys(self):
        for key in grouped_keys():
            assert key in SCHEMA.defaults, key

    def test_every_kept_field_is_in_a_group(self):
        kept = set(SCHEMA.defaults) - set(PANEL_KEYS) - set(ADVANCED)

        assert kept <= set(grouped_keys()), sorted(kept - set(grouped_keys()))

    def test_advanced_fields_stay_out_of_the_groups(self):
        assert not set(ADVANCED) & set(grouped_keys())

    def test_every_group_has_a_label_in_both_languages(self):
        for group in spec()['groups']:
            for language in ('ru', 'en'):
                assert group['label'] in STRINGS[language], (language, group['label'])


if __name__ == '__main__':
    unittest.main()
