# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.personal_missions.i18n import STRINGS
from otmetki.features.personal_missions.model import (
    build_page,
    clean_missions,
    counts,
    format_hangar,
    in_progress,
)
from otmetki.features.personal_missions.model.constants import MAX_MISSIONS, MAX_TEXT, PREVIEW_MISSIONS
from otmetki.features.personal_missions.model.preview import preview_missions, preview_text, preview_widget
from otmetki.features.personal_missions.settings import SCHEMA, SETTINGS

FINISHED_COUNT = MAX_MISSIONS + 20


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def settings(**values):
    return Settings(values, SCHEMA)


def missions(language='ru'):
    return preview_missions(translator(language))[0]


def ids(items):
    return [mission['id'] for mission in items]


def raw_with_garbage():
    return list(PREVIEW_MISSIONS) + [
        {'id': 9, 'name': u'<b>X</b>  1', 'main': u'a' * 500, 'state': 'in_progress'},
        {'id': 10, 'name': u'Y', 'state': 'failed'},
        {'id': 11, 'name': u'', 'state': 'done'},
        'junk',
    ]


def many_finished_and_one_active():
    finished = [{'id': index, 'name': u'Done %d' % index, 'state': 'done'} for index in range(FINISHED_COUNT)]
    active = {'id': 'last', 'name': u'Active', 'state': 'in_progress'}
    return clean_missions(finished + [active])


class CleanTest(unittest.TestCase):

    def test_invalid_missions_are_dropped_and_the_active_ones_come_first(self):
        cleaned, _totals = clean_missions(raw_with_garbage())

        assert ids(cleaned) == [1, 2, 9, 3]

    def test_names_lose_their_tags_and_extra_spaces(self):
        cleaned, _totals = clean_missions(raw_with_garbage())

        assert cleaned[2]['name'] == u'X 1'

    def test_long_conditions_are_cut(self):
        cleaned, _totals = clean_missions(raw_with_garbage())

        assert len(cleaned[2]['main']) == MAX_TEXT

    def test_totals_count_the_valid_missions(self):
        _cleaned, totals = clean_missions(raw_with_garbage())

        assert totals == {'active': 3, 'done': 1, 'honors': 1}


class CapTest(unittest.TestCase):

    def test_the_cap_keeps_the_mission_in_progress(self):
        cleaned, _totals = many_finished_and_one_active()

        assert len(cleaned) == MAX_MISSIONS
        assert cleaned[0]['id'] == 'last'

    def test_the_totals_count_every_mission(self):
        _cleaned, totals = many_finished_and_one_active()

        assert totals == {'active': 1, 'done': 80, 'honors': 0}

    def test_the_hangar_title_shows_the_totals(self):
        cleaned, totals = many_finished_and_one_active()

        text = format_hangar(cleaned, settings(), translator('en'), totals)

        assert u'1 in progress, 80 done' in text
        assert u'Active' in text


class InProgressTest(unittest.TestCase):

    def test_only_the_missions_in_progress(self):
        assert ids(in_progress(missions())) == [1, 2]

    def test_counts(self):
        assert counts(missions()) == {'active': 2, 'done': 1, 'honors': 1}


class HangarTextTest(unittest.TestCase):

    def test_the_title_counts_the_missions(self):
        text = format_hangar(missions(), settings(), translator())

        assert u'ЛБЗ: в работе 2, выполнено 1, с отличием 1' in text

    def test_the_main_condition_is_shown(self):
        text = format_hangar(missions(), settings(), translator())

        assert u'Основное: Нанести 3000 урона' in text

    def test_the_honours_condition_is_shown(self):
        text = format_hangar(missions(), settings(), translator())

        assert u'С отличием: Не получить' in text

    def short_text(self):
        return format_hangar(missions('en'), settings(show_conditions=False, max_missions=1), translator('en'))

    def test_the_short_view_keeps_the_first_mission(self):
        assert u'MT-7' in self.short_text()

    def test_the_short_view_caps_the_missions(self):
        assert u'HT-3' not in self.short_text()

    def test_the_short_view_hides_the_conditions(self):
        assert 'Main:' not in self.short_text()

    def test_the_english_preview_names_the_missions_in_english(self):
        names = [mission['name'] for mission in missions('en')]

        assert names == [u'MT-7. Fire Support', u'HT-3. Breakthrough', u'LT-1. Recon']

    def test_no_mission_in_progress(self):
        done_only = [mission for mission in missions() if mission['state'] != 'in_progress']

        text = format_hangar(done_only, settings(), translator())

        assert u'Нет задач в работе' in text

    def test_no_missions_hides_the_label(self):
        assert format_hangar([], settings(), translator()) is None


class PageTest(unittest.TestCase):

    def test_rows_in_state_order(self):
        page = build_page(missions(), translator())

        assert [row['id'] for row in page['rows']] == ['1', '2', '3']

    def test_a_mission_done_with_honours(self):
        row = build_page(missions(), translator())['rows'][2]

        assert row['subtitle'] == u'Выполнена с отличием'
        assert row['badge'] == u'✓✓'

    def test_a_mission_in_progress_has_no_badge(self):
        row = build_page(missions(), translator())['rows'][0]

        assert row['badge'] is None

    def test_the_main_condition_detail(self):
        row = build_page(missions(), translator())['rows'][0]

        assert row['details'][0] == {'label': u'Основное условие', 'value': u'Нанести 3000 урона'}

    def test_no_missions_no_rows(self):
        assert build_page([], translator())['rows'] == []


class SettingsTest(unittest.TestCase):

    def test_preview_shows_the_missions_in_progress(self):
        assert u'СТ-7' in preview_text(settings(), translator())

    def test_preview_is_the_hangar_card(self):
        payload = preview_widget(settings(), translator())

        assert payload['data']['title'] == u'ЛБЗ'

    def test_settings_switch(self):
        assert SETTINGS == ('hangar_personal_missions',)

    def test_strings_in_both_languages(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class FixedSettingsTest(unittest.TestCase):

    def test_the_font_size_is_fixed(self):
        assert 'font_size' not in SCHEMA.defaults
        assert Settings({'font_size': 30}, SCHEMA).get('font_size') == 14


if __name__ == '__main__':
    unittest.main()
