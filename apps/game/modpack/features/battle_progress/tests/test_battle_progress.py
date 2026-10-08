# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import unittest

import _support
from otmetki.core.format import COLOR_UP
from otmetki.core.me import tank_rows
from otmetki.core.hud.panel import ATTACHED
from otmetki.core.settings import Settings
from otmetki.features.battle_progress.i18n import STRINGS
from otmetki.features.battle_progress.model import BattleCounts, progress_state
from otmetki.features.battle_progress.model.constants import KIND_BY_EVENT
from otmetki.features.battle_progress.model.main_gun import main_gun_applies, main_gun_state, medal_status, threshold
from otmetki.features.battle_progress.model.preview import preview_text, preview_widget
from otmetki.features.battle_progress.model.rows import progress_rows
from otmetki.features.battle_progress.model.text import format_panel
from otmetki.features.battle_progress.model.widget import panel_widget
from otmetki.features.battle_progress.model.wn8 import rating_color, wn8, wn8_state
from otmetki.features.battle_progress.settings import SCHEMA, SETTINGS

ACCOUNT = 12345678
EXPECTED = {'damage': 1180.0, 'spot': 1.42, 'frag': 0.98, 'def': 0.75, 'win_rate': 52.3}
LABELLED_KEYS = ('row_main_gun', 'row_wn8', 'main_gun_share')


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def settings(**values):
    return Settings(values, SCHEMA)


def site_row():
    data = _support.load_json(os.path.join(_support.CONTRACT_DIR, 'examples', 'ratings-tanks.example.json'))
    data['account_id'] = ACCOUNT
    return tank_rows(data, ACCOUNT)[1]


def counts(damage=0, frags=0, spot=0, defence=0):
    return {'damage': damage, 'frags': frags, 'spot': spot, 'def': defence}


def state(main_gun=None, row=None, settled=False, **counted):
    return progress_state(counts(**counted), main_gun, row, settled)


def rows_of(battle, language='ru', **values):
    return progress_rows(battle, settings(**values), translator(language))


def only_row(battle, **values):
    return rows_of(battle, **values)[0]


def full_state():
    return state(main_gun_state(1850, 14700, 8580), site_row(), damage=1850, spot=1, frags=1)


class ThresholdTest(unittest.TestCase):

    def test_is_a_fifth_of_the_enemy_hp(self):
        assert threshold(14700) == 2940

    def test_a_fifth_of_the_enemy_hp_is_rounded_up(self):
        assert threshold(14701) == 2941

    def test_is_at_least_1000(self):
        assert threshold(3000) == 1000

    def test_is_1000_without_the_enemy_hp(self):
        assert threshold(None) == 1000


class MedalStatusTest(unittest.TestCase):

    def test_is_in_progress_while_the_enemies_have_enough_hp_left(self):
        assert medal_status(damage=1850, need=2940, remaining=8580, hit_ally=False) == 'progress'

    def test_is_reached_at_the_threshold(self):
        assert medal_status(damage=2940, need=2940, remaining=0, hit_ally=False) == 'reached'

    def test_is_unreachable_when_the_enemies_have_less_hp_left_than_still_needed(self):
        assert medal_status(damage=1850, need=2940, remaining=1089, hit_ally=False) == 'unreachable'

    def test_is_still_reachable_with_exactly_the_hp_still_needed(self):
        assert medal_status(damage=1850, need=2940, remaining=1090, hit_ally=False) == 'progress'

    def test_is_unreachable_once_the_own_vehicle_is_destroyed(self):
        assert medal_status(damage=1850, need=2940, remaining=8580, hit_ally=False, is_alive=False) == 'unreachable'

    def test_is_failed_once_an_own_shot_hit_an_ally(self):
        assert medal_status(damage=3100, need=2940, remaining=8580, hit_ally=True) == 'failed'


class MainGunBattleTypeTest(unittest.TestCase):

    def test_shows_in_a_random_battle(self):
        assert main_gun_applies(1)

    def test_shows_in_the_epic_random_and_mapbox_battles(self):
        assert main_gun_applies(19)
        assert main_gun_applies(24)

    def test_stays_out_of_a_training_room(self):
        assert not main_gun_applies(2)

    def test_stays_out_of_onslaught(self):
        assert not main_gun_applies(30)

    def test_an_arena_without_a_gui_type_counts_as_random(self):
        assert main_gun_applies(None)


class MainGunStateTest(unittest.TestCase):

    def test_counts_the_share_of_the_team_damage(self):
        main_gun = main_gun_state(1850, 14700, 8580)

        assert main_gun == {
            'damage': 1850,
            'need': 2940,
            'remaining': 8580,
            'team': 6120,
            'share': 30,
            'status': 'progress',
        }

    def test_team_damage_is_never_below_the_own_damage(self):
        assert main_gun_state(900, 14700, 14700)['team'] == 900

    def test_share_is_zero_without_team_damage(self):
        assert main_gun_state(0, 0, 0)['share'] == 0

    def test_carries_the_ally_hit(self):
        assert main_gun_state(1850, 14700, 8580, hit_ally=True)['status'] == 'failed'


class MainGunRowTest(unittest.TestCase):

    def test_progress_shows_the_damage_still_needed(self):
        row = only_row(state(main_gun_state(1850, 14700, 8580)))

        assert row['text'] == u'Осн. калибр'
        assert row['value'] == u'ещё 1 090'

    def test_progress_never_repeats_the_damage_dealt(self):
        row = only_row(state(main_gun_state(1850, 14700, 8580)))

        assert u'1 850' not in (row['value'], row['note'], row['detail'])
        assert row['note'] is None

    def test_progress_fills_a_gold_bar(self):
        row = only_row(state(main_gun_state(1850, 14700, 8580)))

        assert round(row['progress'], 3) == 0.629
        assert row['progress_tone'] == 'gold'

    def test_reached_is_good_with_a_full_bar(self):
        row = only_row(state(main_gun_state(3100, 14700, 8580)))

        assert row['tone'] == 'good'
        assert row['progress'] == 1.0
        assert row['progress_tone'] == 'good'

    def test_reached_says_earned(self):
        row = only_row(state(main_gun_state(3100, 14700, 8580)))

        assert row['value'] == u'получено'

    def test_exactly_the_threshold_is_reached(self):
        row = only_row(state(main_gun_state(2940, 14700, 8580)))

        assert row['tone'] == 'good'

    def test_reached_keeps_one_line_once_settled(self):
        row = only_row(state(main_gun_state(3100, 14700, 8580), settled=True))

        assert row['progress'] is None

    def test_an_unreachable_medal_has_no_row(self):
        assert rows_of(state(main_gun_state(1850, 14700, 900))) == []

    def test_a_failed_medal_has_no_row(self):
        assert rows_of(state(main_gun_state(1850, 14700, 8580, hit_ally=True))) == []

    def test_a_destroyed_own_vehicle_leaves_no_row_for_a_medal_not_reached(self):
        assert rows_of(state(main_gun_state(1850, 14700, 8580, is_alive=False))) == []

    def test_a_destroyed_own_vehicle_keeps_an_earned_medal(self):
        row = only_row(state(main_gun_state(3100, 14700, 8580, is_alive=False)))

        assert row['value'] == u'получено'

    def test_the_english_row_counts_the_damage_to_go(self):
        row = only_row(state(main_gun_state(1850, 14700, 8580)), language='en')

        assert row['value'] == u'1 090 to go'

    def test_the_share_is_hidden_by_default(self):
        row = only_row(state(main_gun_state(1850, 14700, 8580)))

        assert row['detail'] is None

    def test_the_share_shows_with_its_setting(self):
        row = only_row(state(main_gun_state(1850, 14700, 8580)), main_gun_share=True)

        assert row['detail'] == u'доля 30% · команда 6 120'

    def test_the_preview_shows_the_share_only_with_its_setting(self):
        hidden = preview_widget(settings(), translator())['data']['main_gun']
        shown = preview_widget(settings(main_gun_share=True), translator())['data']['main_gun']

        assert hidden['detail'] is None
        assert shown['detail']


class Wn8Test(unittest.TestCase):

    def test_an_expected_battle_scores_1565(self):
        assert wn8(counts(damage=1180, spot=1.42, frags=0.98, defence=0.75), EXPECTED) == 1565

    def test_an_empty_battle_scores_the_win_part_only(self):
        assert wn8(counts(), EXPECTED) == 145

    def test_the_frag_ratio_is_capped_by_the_damage_ratio(self):
        assert wn8(counts(damage=1180, frags=10), EXPECTED) == 1377

    def test_a_strong_battle(self):
        assert wn8(counts(damage=2360, spot=3, frags=2), EXPECTED) == 4233

    def test_no_expected_values_no_estimate(self):
        assert wn8(counts(damage=1000, spot=1, frags=1), None) is None

    def test_zero_expected_values_count_as_zero_ratios(self):
        expected = dict(EXPECTED, spot=0, frag=0, **{'def': 0})

        assert wn8(counts(damage=1000, spot=1, frags=1), expected) == 933

    def test_state_from_the_site_row(self):
        estimate = wn8_state(counts(damage=1506, spot=1, frags=1), site_row())

        assert estimate == {'wn8': 1846, 'tank_wn8': 2104.9}

    def test_without_a_row_there_is_no_estimate(self):
        assert wn8_state(counts(damage=10), None) is None

    def test_the_colour_follows_the_rating_scale(self):
        assert rating_color(1846) == '#4FC3B0'

    def test_the_lowest_tier_takes_a_negative_value(self):
        assert rating_color(-5) == '#E3564A'


class Wn8RowTest(unittest.TestCase):

    def test_shows_the_estimate_and_the_tank_wn8(self):
        row = only_row(state(row=site_row(), damage=1506, spot=1, frags=1))

        assert row['value'] == u'~1 846'
        assert row['note'] == u'танк 2 105'

    def test_is_coloured_by_the_rating_scale(self):
        row = only_row(state(row=site_row(), damage=1506, spot=1, frags=1))

        assert row['color'] == '#4FC3B0'

    def test_wn8_is_always_coloured(self):
        assert settings(colored=False).get('colored') is True


class PlateTest(unittest.TestCase):

    def test_rows_keep_their_order(self):
        kinds = [row['kind'] for row in rows_of(full_state())]

        assert kinds == ['main_gun', 'wn8']

    def test_a_row_switched_off_is_left_out(self):
        kinds = [row['kind'] for row in rows_of(full_state(), row_main_gun=False)]

        assert kinds == ['wn8']

    def test_rows_without_data_are_left_out(self):
        assert rows_of(state(damage=1850)) == []

    def test_no_rows_hide_the_plate(self):
        assert panel_widget([]) is None

    def test_no_rows_draw_no_text(self):
        assert format_panel([], settings()) is None

    def test_the_plate_is_its_own_widget_kind(self):
        payload = panel_widget(rows_of(full_state()))

        assert payload['kind'] == 'battle_progress'

    def test_the_text_colours_a_reached_threshold_up(self):
        text = format_panel(rows_of(state(main_gun_state(3100, 14700, 8580))), settings())

        assert COLOR_UP in text

    def test_a_plate_without_reachable_rows_draws_no_text(self):
        battle = state(main_gun_state(1850, 14700, 8580, hit_ally=True))

        assert format_panel(rows_of(battle), settings()) is None


class WidgetTest(unittest.TestCase):

    def main_gun(self, battle, **values):
        return panel_widget(rows_of(battle, **values))['data']['main_gun']

    def test_the_medal_counts_down_the_damage_left(self):
        main_gun = self.main_gun(state(main_gun_state(1850, 14700, 8580)))

        assert main_gun['left'] == 1090

    def test_the_medal_carries_the_damage_and_the_threshold(self):
        main_gun = self.main_gun(state(main_gun_state(1850, 14700, 8580)))

        assert (main_gun['damage'], main_gun['need']) == (1850, 2940)

    def test_the_medal_is_named_in_full(self):
        main_gun = self.main_gun(state(main_gun_state(1850, 14700, 8580)))

        assert main_gun['title'] == u'Основной калибр'

    def test_the_medal_draws_the_large_stock_art(self):
        main_gun = self.main_gun(state(main_gun_state(1850, 14700, 8580)))

        assert main_gun['icon'] == 'img://gui/maps/icons/achievement/mainGun.png|otmetki:target'

    def test_the_medal_carries_the_stock_tick_for_a_reached_medal(self):
        main_gun = self.main_gun(state(main_gun_state(1850, 14700, 8580)))

        assert main_gun['reached_icon'] == 'img://gui/maps/icons/library/done.png|otmetki:check'

    def test_the_damage_left_has_its_caption(self):
        main_gun = self.main_gun(state(main_gun_state(1850, 14700, 8580)))

        assert main_gun['left_caption'] == u'до медали'

    def test_progress_fills_the_bar_to_three_places(self):
        main_gun = self.main_gun(state(main_gun_state(1850, 14700, 8580)))

        assert main_gun['progress'] == 0.629

    def test_a_reached_medal_says_earned(self):
        main_gun = self.main_gun(state(main_gun_state(3100, 14700, 8580)))

        assert main_gun['status'] == 'reached'
        assert main_gun['reached_text'] == u'получено'

    def test_a_reached_medal_has_nothing_left(self):
        main_gun = self.main_gun(state(main_gun_state(3100, 14700, 8580)))

        assert main_gun['left'] == 0

    def test_a_settled_medal_drops_the_bar(self):
        main_gun = self.main_gun(state(main_gun_state(3100, 14700, 8580), settled=True))

        assert main_gun['progress'] is None

    def test_the_share_goes_under_the_medal_with_its_setting(self):
        main_gun = self.main_gun(state(main_gun_state(1850, 14700, 8580)), main_gun_share=True)

        assert main_gun['detail'] == u'доля 30% · команда 6 120'

    def test_the_wn8_line_carries_the_estimate_and_its_colour(self):
        wn8 = panel_widget(rows_of(full_state()))['data']['wn8']

        assert wn8 == {
            'icon': 'otmetki:wn8',
            'label': u'WN8 боя',
            'value': u'~2 293',
            'color': '#5B9BF2',
            'note': u'танк 2 105',
        }

    def test_a_row_switched_off_leaves_its_section_empty(self):
        payload = panel_widget(rows_of(full_state(), row_wn8=False))

        assert payload['data']['wn8'] is None

    def test_an_unreachable_medal_leaves_only_the_wn8_line(self):
        battle = state(main_gun_state(1850, 14700, 900), site_row(), damage=1850, spot=1, frags=1)

        payload = panel_widget(rows_of(battle))

        assert payload['data']['main_gun'] is None

    def test_fixture_for_the_page(self):
        assert _support.widget_fixture('battle_progress', preview_widget(settings(), translator()))


class CountsTest(unittest.TestCase):

    def test_starts_every_count_at_zero(self):
        assert BattleCounts().values == counts()

    def test_an_unknown_count_is_not_added(self):
        assert BattleCounts().add('xp', 1) is False

    def test_counts_only_what_the_wn8_estimate_reads(self):
        assert sorted(BattleCounts().values) == ['damage', 'def', 'frags', 'spot']

    def test_the_summary_raises_the_damage(self):
        battle = BattleCounts()
        battle.add('damage', 390)

        battle.raise_to('damage', 2150)

        assert battle.values['damage'] == 2150

    def test_assist_is_not_counted(self):
        assert 'assist' not in dict(KIND_BY_EVENT).values()


class SettingsTest(unittest.TestCase):

    def test_switch(self):
        assert SETTINGS == ('battle_progress',)

    def test_strings_in_sync(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_every_player_setting_has_a_label(self):
        for key in LABELLED_KEYS:
            assert 'battle_progress_' + key in STRINGS['ru'], key

    def test_the_record_row_is_gone(self):
        assert not [key for key in SCHEMA.defaults if 'record' in key]

    def test_defaults_to_the_right_of_the_team_hp_strip(self):
        defaults = SCHEMA.defaults

        assert (defaults['x'], defaults['y'], defaults['align_x'], defaults['align_y']) == (423, 4, 'center', 'top')
        assert ATTACHED['otmetki.hud.battle_progress'] == 'score_right'

    def test_a_plate_left_in_the_old_right_column_moves(self):
        assert (-372, 60, 'right', 'top') in SCHEMA.retired


class PreviewTest(unittest.TestCase):

    def test_the_preview_shows_the_medal(self):
        payload = preview_widget(settings(), translator())

        assert payload['data']['main_gun'] is not None

    def test_the_preview_shows_the_wn8_line(self):
        payload = preview_widget(settings(), translator())

        assert payload['data']['wn8'] is not None

    def test_the_preview_text_counts_down_to_the_threshold(self):
        text = preview_text(settings(), translator())

        assert u'ещё 1 090' in text


if __name__ == '__main__':
    unittest.main()
