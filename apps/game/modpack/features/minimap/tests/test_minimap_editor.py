from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

from otmetki.core.settings import Settings
from otmetki.features.minimap.i18n import STRINGS
from otmetki.features.minimap.model.editor import editor
from otmetki.features.minimap.settings import SCHEMA


def spec():
    return editor(Settings(None, SCHEMA), lambda key, **params: key)


def grouped():
    return [key for group in spec()['groups'] for key in group['keys']]


class EditorTest(unittest.TestCase):

    def test_the_groups_cover_every_field_once(self):
        assert sorted(grouped()) == sorted(SCHEMA.defaults)

    def test_the_window_draws_a_schematic(self):
        assert spec()['schematic'] == 'minimap'
        assert 'samples' not in spec()

    def test_every_group_is_labelled_in_both_languages(self):
        for group in spec()['groups']:
            assert all(group['label'] in STRINGS[language] for language in ('ru', 'en'))


if __name__ == '__main__':
    unittest.main()
