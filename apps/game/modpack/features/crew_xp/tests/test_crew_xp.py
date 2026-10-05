# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.crew_xp.i18n import STRINGS
from otmetki.features.crew_xp.model import battles_left, clean_crew, clean_member, format_hangar, tooltip_text
from otmetki.features.crew_xp.model.widget import hangar_widget
from otmetki.features.crew_xp.settings import DEFAULTS, SCHEMA, SETTINGS


def translator():
    return _support.translator(STRINGS, 'ru')


def raw(xp_left=4200, level=60, avg_xp=700, factor=1.0, role=u'Наводчик'):
    member = {'role': role, 'name': u'Иван Петров', 'xp_left': xp_left, 'level': level}
    member.update({'avg_xp': avg_xp, 'factor': factor})
    return member


class BattlesTest(unittest.TestCase):

    def test_battles_round_up(self):
        assert battles_left(4200, 700) == 6
        assert battles_left(4201, 700) == 7

    def test_the_crew_factor_speeds_it_up(self):
        assert battles_left(4200, 700, 1.5) == 4

    def test_nothing_left_is_no_battles(self):
        assert battles_left(0, 0) == 0

    def test_an_unknown_average_is_unknown(self):
        assert battles_left(100, None) is None
        assert battles_left(100, 0) is None


class MemberTest(unittest.TestCase):

    def test_a_member_keeps_its_battles_and_level(self):
        member = clean_member(raw())

        assert member['battles'] == 6
        assert member['level'] == 60

    def test_broken_members_are_dropped(self):
        assert clean_crew([None, {'xp_left': -1}, {'xp_left': True}, raw()]) == [clean_member(raw())]
        assert clean_crew('nope') == []

    def test_the_tooltip_line_names_xp_and_battles(self):
        text = tooltip_text(clean_member(raw()), translator())

        assert text == u'Три отметки: 4 200 опыта до навыка, ≈ 6 боёв'

    def test_a_ready_skill_says_so(self):
        text = tooltip_text(clean_member(raw(xp_left=0)), translator())

        assert text == u'Три отметки: можно выбрать новый навык'


class CardTest(unittest.TestCase):

    def test_the_card_has_a_row_per_member(self):
        crew = clean_crew([raw(), raw(xp_left=0, role=u'Командир')])

        widget = hangar_widget(crew, translator())

        assert [row['text'] for row in widget['data']['rows']] == [u'Наводчик', u'Командир']
        assert widget['data']['rows'][0]['progress'] == 0.6

    def test_no_crew_draws_nothing(self):
        assert format_hangar([], Settings(None, SCHEMA), translator()) is None
        assert hangar_widget([], translator()) is None


class SettingsTest(unittest.TestCase):

    def test_the_card_is_off_by_default(self):
        assert DEFAULTS['show_card'] is False

    def test_the_tooltip_line_is_on_by_default(self):
        assert DEFAULTS['show_tooltip'] is True

    def test_the_component_switch_is_hangar_crew_xp(self):
        assert SETTINGS == ('hangar_crew_xp',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class FixedSettingsTest(unittest.TestCase):

    def test_the_font_size_is_fixed(self):
        assert 'font_size' not in SCHEMA.defaults
        assert Settings({'font_size': 30}, SCHEMA).get('font_size') == 14


if __name__ == '__main__':
    unittest.main()
