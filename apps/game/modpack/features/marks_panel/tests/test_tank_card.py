# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.format import strip_tags
from otmetki.core.moe import ThresholdCurve
from otmetki.core.settings import Settings
from otmetki.features.marks_panel.i18n import STRINGS
from otmetki.features.marks_panel.model import hangar_state
from otmetki.features.marks_panel.model.card import TankCard, percent_history, tank_card
from otmetki.features.marks_panel.model.card_text import card_text
from otmetki.core.format import TIER_COLORS
from otmetki.features.marks_panel.model.constants import TANK_CARD_KIND
from otmetki.features.marks_panel.model.preview import card_preview_text, card_preview_widget
from otmetki.features.marks_panel.settings import CARD_PANEL_ID, CARD_SCHEMA, SCHEMA

CURVE = {'thresholds': {'65': 2000, '85': 2600, '95': 3100}}
SNAPSHOT = {'tank_id': 1, 'moving_avg_damage': 2500, 'damage_rating': 8150, 'marks_on_gun': 1}
SUMMARY = {'last_delta': 0.4, 'trend': -0.3, 'trend_battles': 3, 'deltas': [0.2, -0.9, 0.4]}
TANK = {'wn8': {'value': 2310, 'tier': 'very_good'}, 'win_rate': 56.25, 'battles': 213}


def translator(language='en'):
    return _support.translator(STRINGS, language)


def state(pace=3000, curve=True, snapshot=SNAPSHOT):
    thresholds = ThresholdCurve.from_api(curve if isinstance(curve, dict) else CURVE) if curve else None
    return hangar_state(snapshot, thresholds, pace)


def tank_data(summary=None, tank=None, held=False, **state_values):
    return TankCard(state(**state_values), u'T-34', summary, tank, held, class_tag='mediumTank', tier=7)


def payload(data, **values):
    return tank_card(data, Settings(values, CARD_SCHEMA), translator())


def widget(data, **values):
    return payload(data, **values)['data']


def section(data, title, **values):
    found = [item for item in widget(data, **values)['sections'] if item['title'] == title]
    return found[0] if found else None


def cell_labels(data, title, **values):
    found = section(data, title, **values)
    return [item['label'] for item in found['cells']] if found else []


def text_lines(data, **values):
    return strip_tags(card_text(data, Settings(values, CARD_SCHEMA), translator())).split('\n')


class HeaderTest(unittest.TestCase):

    def test_the_card_is_its_own_widget(self):
        assert payload(tank_data())['kind'] == TANK_CARD_KIND

    def test_the_header_names_the_tank_with_its_tier(self):
        card = widget(tank_data())

        assert (card['vehicle'], card['tier']) == (u'T-34', 7)

    def test_the_class_icon_falls_back_to_our_glyph(self):
        assert widget(tank_data())['class_icon'].endswith(u'|otmetki:class_medium')

    def test_the_marks_on_the_gun(self):
        assert widget(tank_data())['marks'] == 1

    def test_the_percent_is_the_dossier_value(self):
        assert widget(tank_data())['percent'] == 81.5

    def test_the_last_change_comes_from_the_history(self):
        assert widget(tank_data(SUMMARY))['delta'] == 0.4

    def test_without_history_no_change(self):
        assert widget(tank_data())['delta'] is None


class TrendTest(unittest.TestCase):

    def test_the_sparkline_walks_back_from_today(self):
        assert widget(tank_data(SUMMARY))['points'] == [81.8, 82.0, 81.1, 81.5]

    def test_the_trend_switches_off(self):
        assert widget(tank_data(SUMMARY), show_trend=False)['points'] == []

    def test_the_percent_history_ends_at_today(self):
        assert percent_history(80.0, [0.5, -0.25]) == [79.75, 80.25, 80.0]

    def test_one_reading_has_no_history(self):
        assert percent_history(80.0, []) == []


class BarTest(unittest.TestCase):

    def test_each_level_shows_the_average_it_needs(self):
        levels = widget(tank_data())['thresholds']

        assert [(item['level'], item['average']) for item in levels] == [(65, u'2 000'), (85, u'2 600'), (95, u'3 100')]

    def test_reached_levels_are_marked(self):
        levels = widget(tank_data())['thresholds']

        assert [item['reached'] for item in levels] == [True, False, False]

    def test_the_100_percent_joins_when_the_site_has_it(self):
        curve = {'thresholds': {'65': 2000, '85': 2600, '95': 3100, '100': 4000}}

        assert widget(tank_data(curve=curve))['thresholds'][-1]['level'] == 100

    def test_without_a_curve_no_scale_and_a_note(self):
        card = widget(tank_data(curve=False))

        assert card['thresholds'] == []
        assert card['note'] == u'no thresholds for this tank'


class GoalTest(unittest.TestCase):

    def test_the_goal_is_the_next_mark(self):
        assert widget(tank_data())['goal']['label'] == u'To 85 %'

    def test_the_goal_shows_the_damage_one_battle_needs(self):
        goal = widget(tank_data())['goal']

        assert (goal['value'], goal['note']) == (u'7 550', u'per battle')

    def test_the_goal_counts_the_battles_at_the_pace(self):
        assert widget(tank_data())['goal']['battles'] == u'~12 battles'

    def test_without_a_pace_no_battles(self):
        assert widget(tank_data(pace=None))['goal']['battles'] is None

    def test_three_marks_aim_at_100_when_the_site_has_it(self):
        curve = {'thresholds': {'65': 2000, '85': 2300, '95': 2450, '100': 4000}}
        snapshot = dict(SNAPSHOT, damage_rating=9600, marks_on_gun=3)

        assert widget(tank_data(curve=curve, snapshot=snapshot))['goal']['label'] == u'To 100 %'

    def test_three_marks_without_100_say_so(self):
        curve = {'thresholds': {'65': 2000, '85': 2300, '95': 2450}}
        snapshot = dict(SNAPSHOT, damage_rating=9600, marks_on_gun=3)

        assert widget(tank_data(curve=curve, snapshot=snapshot))['goal']['label'] == u'Three marks on the gun'

    def test_without_a_curve_no_goal(self):
        assert widget(tank_data(curve=False))['goal'] is None


class GridTest(unittest.TestCase):

    def test_compact_keeps_the_grid_for_alt(self):
        assert widget(tank_data(SUMMARY, TANK))['sections'] == []

    def test_compact_hints_at_alt(self):
        assert widget(tank_data(tank=TANK))['hint'] == u'Alt: more'

    def test_no_hint_when_alt_shows_nothing(self):
        assert widget(tank_data(tank=TANK), alt_detail=False)['hint'] is None

    def test_alt_shows_the_grid(self):
        assert cell_labels(tank_data(SUMMARY, held=True), u'Mark') == [
            u'Average damage', u'Pace', u'To 82 %', u'Over 3 battles',
        ]

    def test_the_extended_style_shows_the_grid_without_alt(self):
        assert section(tank_data(), u'Mark', style='extended') is not None

    def test_no_hint_while_the_grid_shows(self):
        assert widget(tank_data(held=True))['hint'] is None

    def test_the_average_names_what_the_next_mark_needs(self):
        average = section(tank_data(held=True), u'Mark')['cells'][0]

        assert (average['value'], average['note']) == (u'2 500', u'needs 2 600')

    def test_the_trend_is_toned_by_its_sign(self):
        trend = section(tank_data(SUMMARY, held=True), u'Mark')['cells'][-1]

        assert (trend['value'], trend['tone']) == (u'-0,30 %', 'bad')

    def test_the_tank_wn8_in_its_rating_colour(self):
        rating = section(tank_data(tank=TANK, held=True), u'Tank')['cells'][0]

        assert (rating['value'], rating['color']) == (u'2 310', TIER_COLORS['very_good'])

    def test_the_wins_note_the_battles(self):
        wins = section(tank_data(tank=TANK, held=True), u'Tank')['cells'][1]

        assert (wins['value'], wins['note']) == (u'56,25 %', u'213 battles')

    def test_the_ratings_switch_off(self):
        assert section(tank_data(tank=TANK, held=True), u'Tank', show_tank_ratings=False, show_mastery=False) is None


class WithoutMarksTest(unittest.TestCase):

    def without_marks(self):
        return TankCard(None, u'MS-1', None, TANK)

    def test_a_tank_without_marks_shows_its_grid_at_rest(self):
        assert cell_labels(self.without_marks(), u'Tank') == [u'Tank WN8', u'Wins']

    def test_a_tank_without_marks_has_no_percent_or_scale(self):
        card = widget(self.without_marks())

        assert (card['percent'], card['thresholds'], card['goal']) == (None, [], None)

    def test_the_text_of_a_tank_without_marks_names_it(self):
        assert text_lines(self.without_marks())[0] == u'MS-1'


class TextTest(unittest.TestCase):

    def test_head_line_shows_the_percent_and_the_marks(self):
        assert text_lines(tank_data())[0] == u'MoE 81.50% ★'

    def test_average_line_shows_the_average_and_the_pace(self):
        assert text_lines(tank_data())[1].startswith(u'average 2 500 · pace 3 000')

    def test_forecast_line_counts_the_battles_to_the_next_level(self):
        assert text_lines(tank_data())[3] == u'to 85% (average 2 600): ~12 battles'

    def test_trend_line_follows_the_head(self):
        assert text_lines(tank_data(SUMMARY))[1] == u'Last battle +0.40% · Over 3 battles -0.30%'

    def test_ratings_line_on_alt(self):
        assert text_lines(tank_data(tank=TANK, held=True))[-1] == u'Tank WN8 2 310 · wins 56.25% · 213 battles'

    def test_compact_text_keeps_the_ratings_for_alt(self):
        assert u'Tank WN8' not in u' '.join(text_lines(tank_data(tank=TANK)))


class SettingsTest(unittest.TestCase):

    def test_the_card_keeps_the_panel_id_of_the_former_hangar_marks(self):
        assert CARD_PANEL_ID == 'hangar_marks'

    def test_the_card_section_holds_its_place_at_the_hangar_column(self):
        defaults = CARD_SCHEMA.defaults

        assert (defaults['x'], defaults['y'], defaults['align_x'], defaults['align_y']) == (16, 440, 'left', 'top')

    def test_the_card_rows_default_on(self):
        settings = Settings({}, CARD_SCHEMA)

        assert settings.get('show_trend') is True
        assert settings.get('show_tank_ratings') is True
        assert settings.get('alt_detail') is True

    def test_the_card_style_is_compact_or_extended(self):
        assert Settings({'style': 'custom'}, CARD_SCHEMA).get('style') == 'compact'

    def test_the_trend_takes_at_least_one_battle(self):
        settings = Settings({'trend_battles': 0}, CARD_SCHEMA)

        assert settings.get('trend_battles') == 1

    def test_the_history_limits_are_fixed(self):
        settings = Settings({'max_entries': 9999, 'page_rows': 1}, CARD_SCHEMA)

        assert (settings.get('max_entries'), settings.get('page_rows')) == (100, 50)

    def test_the_carousel_percent_is_off_by_default(self):
        assert Settings({}, CARD_SCHEMA).get('carousel_percent') is False

    def test_the_battle_panel_has_no_card_options(self):
        card_only = ('show_trend', 'trend_battles', 'show_tank_ratings', 'show_mastery', 'show_research',
                     'carousel_percent')

        assert [key for key in card_only if key in SCHEMA.defaults] == []

    def test_the_card_has_no_battle_options(self):
        battle_only = ('template', 'show_targets', 'show_battle', 'show_step', 'show_up', 'color_mode', 'bar')

        assert [key for key in battle_only if key in CARD_SCHEMA.defaults] == []


class PreviewTest(unittest.TestCase):

    def test_preview_text_shows_the_sample_percent(self):
        text = strip_tags(card_preview_text(Settings({}, CARD_SCHEMA), translator()))

        assert text.startswith(u'MoE 86.12%')

    def test_the_compact_preview_hints_at_alt(self):
        card = card_preview_widget(Settings({}, CARD_SCHEMA), translator())['data']

        assert card['hint'] == u'Alt: more'

    def test_the_extended_preview_shows_every_section(self):
        card = card_preview_widget(Settings({'style': 'extended'}, CARD_SCHEMA), translator())['data']

        assert [item['title'] for item in card['sections']] == [u'Mark', u'Tank', u'Research']

    def test_the_extended_preview_is_the_page_fixture(self):
        payload = card_preview_widget(Settings({'style': 'extended'}, CARD_SCHEMA), translator('ru'))

        assert _support.widget_fixture(TANK_CARD_KIND, payload)


class UnratedTest(unittest.TestCase):

    def unrated(self):
        snapshot = dict(SNAPSHOT, damage_rating=0)
        return hangar_state(snapshot, ThresholdCurve.from_api(CURVE), 3000)

    def test_a_tank_without_a_dossier_rating_shows_no_zero_percent(self):
        assert widget(TankCard(self.unrated(), u'T-34'))['percent'] is None

    def test_its_next_mark_follows_the_curve(self):
        assert self.unrated()['next_level'] == 85


if __name__ == '__main__':
    unittest.main()
