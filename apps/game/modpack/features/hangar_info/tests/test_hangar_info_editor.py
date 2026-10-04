from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.hangar_info.i18n import STRINGS
from otmetki.features.hangar_info.model.editor import editor
from otmetki.features.hangar_info.settings import ADVANCED, SCHEMA
from otmetki.ui.components import PANEL_POSITION_KEYS


def spec(**values):
    return editor(Settings(values, SCHEMA), _support.translator(STRINGS, 'en'))


def strip(**values):
    return spec(**values)['samples'][0]['widget']['data']


def grouped():
    return [key for group in spec()['groups'] for key in group['keys']]


class EditorTest(unittest.TestCase):

    def test_the_groups_hold_only_fields_of_the_schema(self):
        assert set(grouped()) <= set(SCHEMA.defaults)

    def test_every_field_but_the_place_and_the_advanced_ones_is_grouped(self):
        shown = set(SCHEMA.defaults) - set(ADVANCED) - set(PANEL_POSITION_KEYS)

        assert sorted(grouped()) == sorted(shown)

    def test_the_strip_shows_the_sample_moment(self):
        assert (strip()['time'], strip()['date']) == ('21:47', '03.10')

    def test_the_strip_follows_the_clock_format(self):
        assert strip(clock_format='%H:%M:%S')['time'] == '21:47:05'

    def test_the_strip_follows_the_date_format(self):
        assert strip(date_format='')['date'] == ''

    def test_the_strip_shows_the_server_and_online(self):
        assert (strip()['server'], strip()['online']) == ('RU5', '5148')

    def test_the_strip_drops_the_server_when_switched_off(self):
        assert strip(show_server=False)['server'] == ''

    def test_the_strip_drops_the_ping_when_switched_off(self):
        assert strip(show_ping=False)['ping'] == ''

    def test_the_strip_drops_the_online_when_switched_off(self):
        assert strip(show_online=False)['online'] == ''

    def test_the_sample_has_a_caption(self):
        assert spec()['samples'][0]['label'] == STRINGS['en']['hangar_info_sample_strip']


if __name__ == '__main__':
    unittest.main()
