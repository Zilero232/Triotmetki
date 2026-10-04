# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.comp7_helper.i18n import STRINGS
from otmetki.features.comp7_helper.model import clean_state, format_hangar, next_text, progress, thresholds
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

    def test_a_non_number_rating_is_zero(self):
        assert clean_state({'rating': True})['rating'] == 0


class ProgressTest(unittest.TestCase):

    def test_the_next_division_and_the_points_left(self):
        target, left, share = progress(champion_b())

        assert target['rank'] == 5
        assert target['index'] == 1
        assert left == 350
        assert round(share, 2) == 0.3

    def test_next_text_names_the_division_and_the_points(self):
        assert next_text(champion_b(), translator()) == u'До «Чемпион A»: 350 очков'

    def test_next_text_in_the_legend_ranks_points_to_the_leaderboard(self):
        text = next_text(state(4200, division(6, 2, 4000, 5)), translator())

        assert text == u'«Легенда A» — по месту в таблице лидеров'

    def test_no_progress_from_the_top_division(self):
        assert progress(state(4500, division(6, 1, 4000, 1))) is None

    def test_no_progress_in_qualification(self):
        assert progress(qualification()) is None


class ThresholdsTest(unittest.TestCase):

    def test_statuses_around_the_current_division(self):
        rows = thresholds(champion_b())

        assert [status for _, status in rows] == ['done', 'active', 'idle', 'idle', 'idle', 'idle']

    def test_every_threshold_is_idle_in_qualification(self):
        rows = thresholds(qualification())

        assert set(status for _, status in rows) == {'idle'}


class HangarTextTest(unittest.TestCase):

    def test_title_thresholds_and_skill(self):
        text = format_hangar(champion_b(), Settings({}, SCHEMA), translator())

        assert u'Натиск: Чемпион B, 3 150 очков' in text
        assert u'Легенда A: от 4 000 · топ-1%' in text
        assert u'Навык роли: Точка сбора' in text

    def test_qualification_is_one_line(self):
        settings = Settings({'show_thresholds': False}, SCHEMA)

        text = format_hangar(qualification(skill=None), settings, translator())

        assert text.count('\n') == 0
        assert u'Квалификация' in text

    def test_outside_onslaught_no_text(self):
        assert format_hangar(None, Settings({}, SCHEMA), translator()) is None


class HangarWidgetTest(unittest.TestCase):

    def test_card_shows_the_rating_and_the_division(self):
        widget = champion_b_widget()

        assert widget['kind'] == 'card'
        assert widget['data']['value'] == '3 150'
        assert widget['data']['subtitle'] == 'Champion B'

    def test_first_row_is_the_progress_to_the_next_division(self):
        row = champion_b_widget()['data']['rows'][0]

        assert row['text'] == u'To «Champion A»: 350 points'
        assert row['progress'] == 0.3

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
