# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.team_hp.i18n import STRINGS
from otmetki.features.team_hp.model import TeamHp, bar, format_panel, format_team_hp, icon_row, pinned_place, score_pair
from otmetki.features.team_hp.model.preview import preview_text
from otmetki.features.team_hp.model.strip import strip_options
from otmetki.features.team_hp.settings import SCHEMA

ALL_ON = {'icons': True, 'tiers': True}
NO_TIERS = {'icons': True, 'tiers': False}
STOCK_TOTALS = (2300, 900, 2500, 1200)


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def settings_with(**values):
    return Settings(values, SCHEMA)


def battle():
    teams = TeamHp(own_team=1)
    teams.add(1, 1, 1000)
    teams.add(2, 1, 1500)
    teams.add(3, 2, 1200)
    teams.add(4, 2, 800, alive=False)
    return teams


def battle_with_stock_totals():
    teams = battle()
    teams.set_team_health(*STOCK_TOTALS)
    return teams


def mixed_class_battle():
    teams = TeamHp(own_team=1)
    teams.add(9, 2, 1000, kind='heavyTank')
    teams.add(4, 2, 800, kind=5)
    return teams


class TotalsTest(unittest.TestCase):

    def test_allies_sum_their_hp_and_max_and_count_the_alive(self):
        values = battle().values()

        assert values['allies_hp'] == 2500
        assert values['allies_max'] == 2500
        assert values['allies_alive'] == 2

    def test_enemies_sum_their_hp_and_max_and_count_the_alive(self):
        values = battle().values()

        assert values['enemies_hp'] == 1200
        assert values['enemies_max'] == 2000
        assert values['enemies_alive'] == 1

    def test_a_dead_enemy_is_an_ally_frag(self):
        values = battle().values()

        assert values['allies_frags'] == 1
        assert values['enemies_frags'] == 0

    def test_the_difference_is_allies_minus_enemies_hp(self):
        values = battle().values()

        assert values['diff'] == 1300


class HealthUpdateTest(unittest.TestCase):

    def test_a_new_hp_value_is_a_change(self):
        teams = battle()

        is_changed = teams.set_health(3, 400)

        assert is_changed

    def test_the_same_hp_value_again_is_no_change(self):
        teams = battle()
        teams.set_health(3, 400)

        is_changed = teams.set_health(3, 400)

        assert not is_changed

    def test_negative_hp_is_a_change(self):
        teams = battle()

        is_changed = teams.set_health(1, -50)

        assert is_changed

    def test_negative_hp_is_clamped_to_zero(self):
        teams = battle()

        teams.set_health(1, -50)

        assert teams.vehicles[1]['hp'] == 0

    def test_hp_above_the_max_is_clamped_to_the_unchanged_max(self):
        teams = battle()

        is_changed = teams.set_health(2, 99999)

        assert not is_changed

    def test_an_unknown_vehicle_is_no_change(self):
        teams = battle()

        is_changed = teams.set_health(99, 10)

        assert not is_changed

    def test_a_kill_is_a_change(self):
        teams = battle()

        is_changed = teams.kill(2)

        assert is_changed

    def test_a_second_kill_of_the_same_vehicle_is_no_change(self):
        teams = battle()
        teams.kill(2)

        is_changed = teams.kill(2)

        assert not is_changed

    def test_a_kill_counts_once(self):
        teams = battle()
        teams.kill(2)
        teams.kill(2)

        frags = teams.values()['enemies_frags']

        assert frags == 1

    def test_readd_keeps_known_hp(self):
        teams = battle()
        teams.set_health(3, 700)

        teams.add(3, 2, 1200)

        assert teams.vehicles[3]['hp'] == 700

    def test_rejects_a_vehicle_without_max_hp(self):
        teams = battle()

        is_added = teams.add(5, 2, 0)

        assert not is_added

    def test_rejects_a_vehicle_without_a_numeric_id(self):
        teams = battle()

        is_added = teams.add('x', 2, 100)

        assert not is_added


class BarTest(unittest.TestCase):

    def test_a_bar_is_as_wide_as_asked(self):
        text = bar(50, 100, 10, '#FFFFFF')

        assert text.count('|') == 10

    def test_half_hp_fills_half_the_bar(self):
        text = bar(50, 100, 10, '#FFFFFF')

        assert '>|||||</font>' in text

    def test_no_max_leaves_the_bar_empty(self):
        text = bar(5, 0, 10, '#FFFFFF')

        assert '>||||||||||</font>' in text


class StockTeamHealthTest(unittest.TestCase):

    def test_the_stock_totals_win_over_the_arena_sums_for_the_allies(self):
        values = battle_with_stock_totals().values()

        assert values['allies_hp'] == 2300
        assert values['allies_max'] == 2500

    def test_the_stock_totals_win_over_the_arena_sums_for_the_enemies(self):
        values = battle_with_stock_totals().values()

        assert values['enemies_hp'] == 900
        assert values['enemies_max'] == 1200

    def test_the_difference_follows_the_stock_totals(self):
        values = battle_with_stock_totals().values()

        assert values['diff'] == 1400

    def test_the_arena_keeps_the_alive_counts_and_frags(self):
        values = battle_with_stock_totals().values()

        assert values['enemies_alive'] == 1
        assert values['allies_frags'] == 1

    def test_the_arena_sums_stay_for_the_full_team_max(self):
        teams = battle_with_stock_totals()

        enemies = teams.totals(False)

        assert enemies['max'] == 2000

    def test_repeated_totals_are_no_change(self):
        teams = battle_with_stock_totals()

        is_changed = teams.set_team_health(*STOCK_TOTALS)

        assert not is_changed

    def test_totals_that_are_not_numbers_are_no_change(self):
        teams = battle()

        is_changed = teams.set_team_health(None, 900, 2500, 1200)

        assert not is_changed

    def test_totals_that_are_not_numbers_leave_the_arena_sums(self):
        teams = battle()
        teams.set_team_health(None, 900, 2500, 1200)

        allies = teams.health(True)

        assert allies == {'hp': 2500, 'max': 2500}


class ScoreTest(unittest.TestCase):

    def test_shows_frags_by_default(self):
        pair = score_pair(battle().values(), settings_with())

        assert pair == (1, 0)

    def test_shows_the_alive_vehicles_with_the_alive_toggle(self):
        pair = score_pair(battle().values(), settings_with(show_alive=True))

        assert pair == (2, 1)

    def test_alive_toggle_is_off_by_default(self):
        settings = settings_with()

        assert settings.get('show_alive') is False

    def test_bar_pair_line_carries_the_alive_score(self):
        settings = settings_with(show_alive=True)

        text = format_team_hp(battle().values(), settings, translator())

        assert '2 : 1' in text


class FormatTest(unittest.TestCase):

    def test_full_shows_the_allies_hp(self):
        text = format_team_hp(battle().values(), settings_with(), translator())

        assert '2 500' in text

    def test_full_shows_the_enemies_hp(self):
        text = format_team_hp(battle().values(), settings_with(), translator())

        assert '1 200' in text

    def test_full_shows_the_score(self):
        text = format_team_hp(battle().values(), settings_with(), translator())

        assert '1 : 0' in text

    def test_full_shows_the_signed_difference(self):
        text = format_team_hp(battle().values(), settings_with(), translator())

        assert u'разница +1 300' in text

    def test_compact_has_no_bars(self):
        settings = settings_with(style='compact', show_score=False)

        text = format_team_hp(battle().values(), settings, translator('en'))

        assert '|' not in text.replace('||', '')

    def test_compact_has_no_difference(self):
        settings = settings_with(style='compact', show_score=False)

        text = format_team_hp(battle().values(), settings, translator('en'))

        assert 'difference' not in text

    def test_bars_have_no_numbers(self):
        settings = settings_with(style='bars', show_diff=False)

        text = format_team_hp(battle().values(), settings, translator('en'))

        assert '2 500' not in text

    def test_custom_template(self):
        settings = settings_with(template='{allies_hp}/{enemies_hp} ({diff})')

        text = format_team_hp(battle().values(), settings, translator('en'))

        assert '2 500/1 200 (1 300)' in text

    def test_template_wins_over_the_icon_row(self):
        settings = settings_with(style='icons', template='{allies_hp}')

        text = format_panel(battle(), settings, translator(), ALL_ON)

        assert '2 500' in text


class IconRowTest(unittest.TestCase):

    def icon_style_text(self):
        teams = battle()
        teams.set_health(3, 600)
        return format_panel(teams, settings_with(style='icons'), translator(), ALL_ON)

    def test_each_ally_gets_a_bar_of_the_icon_width(self):
        allies = self.icon_style_text().split('   ')[0]

        assert allies.count('|') == 6

    def test_each_enemy_gets_a_bar_of_the_icon_width(self):
        enemies = self.icon_style_text().split('   ')[2]

        assert enemies.count('|') == 6

    def test_the_score_sits_between_the_sides(self):
        score = self.icon_style_text().split('   ')[1]

        assert '1 : 0' in score

    def test_the_icon_row_has_no_difference_line(self):
        text = self.icon_style_text()

        assert u'разница' not in text

    def test_icon_row_of_no_vehicles_is_empty(self):
        text = icon_row([], 3, '#FFFFFF')

        assert text == ''


class ArenaVehiclesTest(unittest.TestCase):

    def test_classes_and_order_come_from_the_arena(self):
        teams = mixed_class_battle()

        kinds = [vehicle['kind'] for vehicle in teams.team(False)]

        assert kinds == ['heavyTank', None]

    def test_an_enemy_is_not_an_ally(self):
        teams = mixed_class_battle()

        is_ally = teams.is_ally(9)

        assert is_ally is False

    def test_an_unknown_vehicle_is_not_an_ally(self):
        teams = mixed_class_battle()

        is_ally = teams.is_ally(77)

        assert is_ally is False


class SettingsTest(unittest.TestCase):

    def test_the_side_colours_are_the_hud_tones(self):
        settings = settings_with(ally_color='#00ff00', enemy_color='#0000ff')

        assert (settings.get('ally_color'), settings.get('enemy_color')) == ('#7CD35B', '#E3564A')

    def test_the_bar_widths_are_fixed(self):
        settings = settings_with(bar_width=50, icon_width=8)

        assert (settings.get('bar_width'), settings.get('icon_width')) == (30, 3)
        assert 'bar_width' not in SCHEMA.defaults

    def test_strings_in_sync(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class PreviewTest(unittest.TestCase):

    def test_preview_shows_the_allies_hp(self):
        text = preview_text(settings_with(), translator('en'))

        assert '3 200' in text

    def test_preview_shows_the_enemies_hp(self):
        text = preview_text(settings_with(), translator('en'))

        assert '900' in text

    def test_preview_shows_the_score(self):
        text = preview_text(settings_with(), translator('en'))

        assert '2 : 1' in text


class PinnedPlaceTest(unittest.TestCase):

    def test_a_strip_that_replaces_the_stock_one_keeps_its_own_place(self):
        settings = Settings({'style': 'full', 'x': 12, 'y': 0}, SCHEMA)

        place = pinned_place(settings)

        assert place == (12, 0)

    def test_the_numbers_style_sits_right_of_the_stock_strip(self):
        settings = Settings({'style': 'numbers'}, SCHEMA)

        place = pinned_place(settings)

        assert place == (443, 4)

    def test_a_strip_that_keeps_the_stock_one_sits_right_of_it(self):
        settings = Settings({'style': 'full', 'replace_stock': False}, SCHEMA)

        place = pinned_place(settings)

        assert place == (443, 4)


class StripOptionsTest(unittest.TestCase):

    def test_both_on_without_an_answer_from_the_settings_core(self):
        options = strip_options(None)

        assert options == ALL_ON

    def test_tier_grouping_follows_its_option(self):
        options = strip_options({'showVehiclesCounter': True, 'enableTierGrouping': False})

        assert options == NO_TIERS

    def test_tier_grouping_needs_the_vehicle_icons(self):
        options = strip_options({'showVehiclesCounter': False, 'enableTierGrouping': True})

        assert options == {'icons': False, 'tiers': False}


if __name__ == '__main__':
    unittest.main()
