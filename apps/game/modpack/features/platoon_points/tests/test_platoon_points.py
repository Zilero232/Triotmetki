# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.platoon_points.i18n import STRINGS
from otmetki.features.platoon_points.model import Platoon, points, rules_of
from otmetki.features.platoon_points.model.preview import preview_platoon, preview_text, preview_widget
from otmetki.features.platoon_points.model.widget import points_widget
from otmetki.features.platoon_points.settings import SCHEMA, SETTINGS


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def default_rules():
    return rules_of(Settings({}, SCHEMA))


def seen(name, own, vehicle_class, max_hp):
    return {'name': name, 'own': own, 'class': vehicle_class, 'max_hp': max_hp}


def two_man_platoon():
    platoon = Platoon()
    platoon.add(1, seen(u'Вы', True, 'heavyTank', 2000))
    platoon.add(2, seen(u'Друг', False, 'lightTank', 1000))
    return platoon


def fought_platoon():
    platoon = two_man_platoon()
    platoon.add_own('damage', 1000)
    platoon.killed(9, 2, True)
    platoon.set_health(2, 400)
    return platoon


def preview_data():
    return points_widget(preview_platoon(translator()), Settings({}, SCHEMA), translator())['data']


class PointsTest(unittest.TestCase):

    def test_default_rules(self):
        assert default_rules() == {'damage': 100, 'assist': 200, 'frag': 2, 'alive': 1}

    def test_the_own_row_scores_damage_assist_frags_and_being_alive(self):
        row = {'damage': 2450, 'assist': 610, 'frags': 2, 'alive': True}

        assert points(default_rules(), row) == 32

    def test_a_dead_mate_scores_only_the_frags(self):
        row = {'damage': None, 'assist': None, 'frags': 1, 'alive': False}

        assert points(default_rules(), row) == 2


class PlatoonTest(unittest.TestCase):

    def test_two_members_are_a_platoon(self):
        assert two_man_platoon().is_platoon() is True

    def test_own_damage_is_counted(self):
        assert two_man_platoon().add_own('damage', 1000) is True

    def test_frags_are_not_an_own_amount(self):
        assert two_man_platoon().add_own('frags', 1) is False

    def test_negative_damage_is_not_counted(self):
        assert two_man_platoon().add_own('damage', -1) is False

    def test_a_mate_killing_an_enemy_gets_a_frag(self):
        assert two_man_platoon().killed(9, 2, True) is True

    def test_a_kill_outside_the_platoon_changes_nothing(self):
        assert two_man_platoon().killed(9, 5, True) is False

    def test_a_mate_health_update(self):
        assert two_man_platoon().set_health(2, 400) is True

    def test_the_same_health_changes_nothing(self):
        platoon = two_man_platoon()
        platoon.set_health(2, 400)

        assert platoon.set_health(2, 400) is False

    def test_health_of_an_unknown_vehicle_changes_nothing(self):
        assert two_man_platoon().set_health(7, 1) is False

    def test_the_own_row_comes_first_with_the_own_damage(self):
        row = fought_platoon().rows(default_rules())[0]

        assert row['own'] is True
        assert row['damage'] == 1000
        assert row['points'] == 11

    def test_a_mate_row_scores_only_what_the_stock_ui_shows(self):
        row = fought_platoon().rows(default_rules())[1]

        assert row['damage'] is None
        assert row['assist'] is None
        assert row['frags'] == 1
        assert row['points'] == 3

    def test_a_killed_mate_has_no_hp(self):
        platoon = fought_platoon()

        changed = platoon.killed(2, 99, False)

        assert changed is True
        assert platoon.members[2]['hp'] == 0

    def test_without_mates_only_the_own_row(self):
        rows = fought_platoon().rows(default_rules(), False)

        assert [row['own'] for row in rows] == [True]


class SummaryTest(unittest.TestCase):

    def test_the_summary_raises_the_own_totals(self):
        platoon = Platoon()
        platoon.add_own('damage', 300)

        changed = platoon.apply_summary(900, 100)

        assert changed is True
        assert platoon.own_totals() == (900, 100)

    def test_the_same_summary_twice_changes_nothing(self):
        platoon = Platoon()
        platoon.apply_summary(900, 100)

        assert platoon.apply_summary(900, 100) is False


class WidgetTest(unittest.TestCase):

    def test_the_total_sums_the_rows(self):
        data = preview_data()

        assert data['total'] == 34
        assert [row['points'] for row in data['rows']] == [32, 2]

    def test_a_row_carries_the_class_icon(self):
        data = preview_data()

        assert data['rows'][0]['cls'].startswith('img://gui/maps/icons/vehicleTypes/green/heavyTank.png')

    def test_a_mate_row_has_no_damage(self):
        assert preview_data()['rows'][1]['damage'] is None

    def test_the_header_names_the_block(self):
        assert preview_data()['title'] == u'Очки взвода'

    def test_a_row_carries_its_frags_as_a_caption(self):
        assert preview_data()['rows'][0]['frags_text'] == u'фр. 2'

    def test_the_panel_has_no_alt_state(self):
        assert 'extended' not in preview_data()

    def test_a_row_carries_its_hp_for_the_bar(self):
        row = preview_data()['rows'][0]

        assert row['hp'] <= row['max']

    def test_fixture_for_the_page(self):
        assert _support.widget_fixture('platoon_points', preview_widget(Settings({}, SCHEMA), translator()))


class SettingsTest(unittest.TestCase):

    def test_preview_text(self):
        assert u'Итого' in preview_text(Settings({}, SCHEMA), translator())

    def test_strings_in_both_languages(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_settings_switch(self):
        assert SETTINGS == ('battle_platoon_points',)


if __name__ == '__main__':
    unittest.main()
