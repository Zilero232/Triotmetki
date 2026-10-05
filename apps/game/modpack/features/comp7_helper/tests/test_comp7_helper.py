# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.comp7_helper.i18n import STRINGS
from otmetki.features.comp7_helper.model import clean_state, format_hangar, thresholds
from otmetki.features.comp7_helper.model.widget import hangar_widget
from otmetki.features.comp7_helper.settings import SCHEMA, SETTINGS


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def division(rank, index, begin, elite_percent=0):
    return {'rank': rank, 'index': index, 'begin': begin, 'elite_percent': elite_percent}


DIVISIONS = [
    division(4, 1, 2000),
    division(5, 3, 2500),
    division(5, 2, 3000),
    division(5, 1, 3500),
    division(6, 3, 4000, 10),
    division(6, 2, 4000, 5),
    division(6, 1, 4000, 1),
    {'rank': 9, 'index': 1, 'begin': 0},
    None,
]


def state(rating, current, **extra):
    raw = {'rating': rating, 'division': current, 'divisions': list(reversed(DIVISIONS)), 'skill': u'Точка сбора'}
    raw.update(extra)
    return clean_state(raw)


def champion_b():
    return state(3150, division(5, 2, 3000))


def qualification(**extra):
    return state(0, None, qualification=True, **extra)


def champion_b_widget():
    return hangar_widget(champion_b(), Settings({}, SCHEMA), translator('en'))


class CleanStateTest(unittest.TestCase):

    def test_divisions_are_ordered_from_the_lowest_and_bad_ones_dropped(self):
        found = champion_b()

        ranks = [(item['rank'], item['index']) for item in found['divisions']]
        assert ranks == [(4, 1), (5, 3), (5, 2), (5, 1), (6, 3), (6, 2), (6, 1)]

    def test_no_reads_is_none(self):
        assert clean_state(None) is None

    def test_the_rating_the_stock_header_shows_is_not_kept(self):
        assert 'rating' not in champion_b()


class ThresholdsTest(unittest.TestCase):

    def test_statuses_around_the_current_division(self):
        rows = thresholds(champion_b())

        assert [status for _, status in rows] == ['done', 'active', 'idle', 'idle', 'idle', 'idle']

    def test_every_threshold_is_idle_in_qualification(self):
        rows = thresholds(qualification())

        assert set(status for _, status in rows) == {'idle'}


class HangarTextTest(unittest.TestCase):

    def test_thresholds_and_skill(self):
        text = format_hangar(champion_b(), Settings({}, SCHEMA), translator())

        assert u'Легенда A: от 4 000 · топ-1%' in text
        assert u'Навык роли: Точка сбора' in text

    def test_the_rating_and_the_division_are_left_to_the_stock_header(self):
        text = format_hangar(champion_b(), Settings({}, SCHEMA), translator())

        assert u'Натиск: ' not in text

    def test_nothing_to_show_is_no_text(self):
        settings = Settings({'show_thresholds': False, 'show_battles': False}, SCHEMA)

        assert format_hangar(qualification(skill=None), settings, translator()) is None

    def test_outside_onslaught_no_text(self):
        assert format_hangar(None, Settings({}, SCHEMA), translator()) is None


class HangarWidgetTest(unittest.TestCase):

    def test_card_has_no_rating_or_division_of_its_own(self):
        widget = champion_b_widget()

        assert widget['kind'] == 'card'
        assert widget['data'].get('value') is None
        assert widget['data'].get('subtitle') is None

    def test_first_row_is_the_first_threshold(self):
        row = champion_b_widget()['data']['rows'][0]

        assert row['text'] == u'Champion C'

    def test_last_row_is_the_role_skill(self):
        row = champion_b_widget()['data']['rows'][-1]

        assert row['text'] == u'Точка сбора'

    def test_outside_onslaught_no_card(self):
        assert hangar_widget(None, Settings({}, SCHEMA), translator()) is None


class SettingsTest(unittest.TestCase):

    def test_settings_switch(self):
        assert SETTINGS == ('hangar_comp7_helper',)

    def test_strings_in_both_languages(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class FixedSettingsTest(unittest.TestCase):

    def test_the_font_size_is_fixed(self):
        assert 'font_size' not in SCHEMA.defaults
        assert Settings({'font_size': 30}, SCHEMA).get('font_size') == 14


if __name__ == '__main__':
    unittest.main()
