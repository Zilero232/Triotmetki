# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.format import strip_tags
from otmetki.core.moe import ThresholdCurve
from otmetki.core.settings import Settings
from otmetki.features.marks_panel.i18n import STRINGS
from otmetki.features.marks_panel.model import hangar_state
from otmetki.features.marks_panel.model.card import TankCard, card_text, percent_history, tank_card
from otmetki.features.marks_panel.model.constants import CARD_WIDTH, TIER_COLORS
from otmetki.features.marks_panel.model.preview import card_preview_text, card_preview_widget
from otmetki.features.marks_panel.settings import CARD_PANEL_ID, CARD_SCHEMA, SCHEMA

CURVE = {'thresholds': {'65': 2000, '85': 2600, '95': 3100}}
SNAPSHOT = {'tank_id': 1, 'moving_avg_damage': 2500, 'damage_rating': 8150, 'marks_on_gun': 1}
SUMMARY = {'last_delta': 0.4, 'trend': -0.3, 'trend_battles': 3, 'deltas': [0.2, -0.9, 0.4]}
TANK = {'wn8': {'value': 2310, 'tier': 'very_good'}, 'win_rate': 56.25, 'battles': 213}


def translator(language='en'):
    return _support.translator(STRINGS, language)


def state(pace=3000, curve=True):
    thresholds = ThresholdCurve.from_api(CURVE) if curve else None
    return hangar_state(SNAPSHOT, thresholds, pace)


def tank_data(summary=None, tank=None, held=False, **state_values):
    return TankCard(state(**state_values), u'T-34', summary, tank, held)


def widget(data, **values):
    return tank_card(data, Settings(values, SCHEMA), translator())['data']


def text_lines(data, **values):
    return strip_tags(card_text(data, Settings(values, SCHEMA), translator())).split('\n')


def row_texts(data, **values):
    return [row['text'] for row in widget(data, **values)['rows']]


class HeaderTest(unittest.TestCase):

    def test_one_tank_name_and_one_percent(self):
        card = widget(tank_data())

        assert card['subtitle'] == u'T-34'
        assert card['value'] == u'81.50%'

    def test_the_percent_is_gold(self):
        assert widget(tank_data())['value_tone'] == 'gold'

    def test_the_icon_is_the_mark(self):
        assert widget(tank_data())['icon'] == 'img://gui/maps/icons/library/marksOnGun/mark_1.png|otmetki:target'

    def test_the_card_is_a_hangar_card(self):
        card = widget(tank_data())

        assert card['title'] == u'MoE'
        assert card['width'] == CARD_WIDTH

    def test_chips_carry_the_average_and_the_pace(self):
        chips = widget(tank_data())['chips']

        assert [chip['value'] for chip in chips] == [u'2 500', u'3 000']

    def test_without_a_pace_only_the_average_chip(self):
        assert len(widget(tank_data(pace=None))['chips']) == 1


class ThresholdsTest(unittest.TestCase):

    def test_reached_levels_are_done_and_the_next_is_active(self):
        rows = widget(tank_data())['rows']

        assert [row['status'] for row in rows[:3]] == ['done', 'active', 'idle']

    def test_the_next_level_shows_the_damage_per_battle(self):
        row = widget(tank_data())['rows'][1]

        assert row['label'] == u'85%'
        assert row['value'] == u'7 550'
        assert row['note'] == u'per battle'

    def test_the_forecast_counts_the_battles_to_the_next_level(self):
        forecast = widget(tank_data())['rows'][3]

        assert forecast['text'] == u'to 85%'
        assert forecast['value'] == u'~12 battles'

    def test_without_a_curve_the_card_says_so(self):
        assert row_texts(tank_data(curve=False)) == [u'no thresholds for this tank']


class TrendTest(unittest.TestCase):

    def test_the_trend_rows_come_first(self):
        rows = widget(tank_data(SUMMARY))['rows']

        assert rows[0]['value'] == u'+0.40%'
        assert rows[1]['value'] == u'-0.30%'

    def test_the_last_battle_is_toned_by_its_sign(self):
        rows = widget(tank_data(SUMMARY))['rows']

        assert rows[0]['tone'] == 'good'
        assert rows[1]['tone'] == 'bad'

    def test_the_strip_shows_each_battle_of_the_trend(self):
        assert widget(tank_data(SUMMARY))['strip'] == ['good', 'bad', 'good']

    def test_the_trend_switches_off(self):
        card = widget(tank_data(SUMMARY), show_trend=False)

        assert card['strip'] == []
        assert card['rows'][0]['status'] == 'done'

    def test_one_battle_has_no_trend_row(self):
        summary = {'last_delta': 0.4, 'trend': 0.4, 'trend_battles': 1, 'deltas': [0.4]}

        assert widget(tank_data(summary))['rows'][1]['status'] == 'done'


class RatingsTest(unittest.TestCase):

    def test_compact_keeps_the_ratings_for_alt(self):
        texts = row_texts(tank_data(tank=TANK))

        assert u'Tank WN8' not in texts

    def test_compact_hints_at_alt(self):
        assert widget(tank_data(tank=TANK))['footer'] == u'Alt: more'

    def test_alt_shows_the_tank_wn8_in_its_rating_colour(self):
        row = widget(tank_data(tank=TANK, held=True))['rows'][-1]

        assert row['value'] == u'2 310'
        assert row['color'] == TIER_COLORS['very_good']

    def test_the_ratings_row_lists_the_win_rate_and_the_battles(self):
        row = widget(tank_data(tank=TANK, held=True))['rows'][-1]

        assert row['detail'] == u'wins 56.25% · 213 battles'

    def test_extended_shows_the_ratings_without_alt(self):
        row = widget(tank_data(tank=TANK), hangar_style='extended')['rows'][-1]

        assert row['text'] == u'Tank WN8'

    def test_no_hint_while_the_ratings_show(self):
        assert widget(tank_data(tank=TANK, held=True))['footer'] is None

    def test_no_hint_without_ratings(self):
        assert widget(tank_data())['footer'] is None

    def test_the_ratings_switch_off(self):
        texts = row_texts(tank_data(tank=TANK, held=True), show_tank_ratings=False)

        assert u'Tank WN8' not in texts


class WithoutMarksTest(unittest.TestCase):

    def test_a_tank_without_marks_still_shows_its_ratings(self):
        data = TankCard(None, u'MS-1', None, TANK)

        assert row_texts(data) == [u'Tank WN8']

    def test_a_tank_without_marks_has_no_percent(self):
        data = TankCard(None, u'MS-1', None, TANK)

        assert widget(data)['value'] is None

    def test_the_text_of_a_tank_without_marks_names_it(self):
        data = TankCard(None, u'MS-1', None, TANK)

        assert text_lines(data)[0] == u'MS-1'


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


class SettingsTest(unittest.TestCase):

    def test_the_card_keeps_the_panel_id_of_the_former_hangar_marks(self):
        assert CARD_PANEL_ID == 'hangar_marks'

    def test_the_card_section_holds_its_place_at_the_hangar_column(self):
        defaults = CARD_SCHEMA.defaults

        assert (defaults['x'], defaults['y'], defaults['align_x'], defaults['align_y']) == (16, 440, 'left', 'top')

    def test_the_hangar_keys_default_on(self):
        settings = Settings({}, SCHEMA)

        assert settings.get('hangar_card') is True
        assert settings.get('show_trend') is True
        assert settings.get('show_tank_ratings') is True

    def test_the_hangar_style_is_compact_or_extended(self):
        assert Settings({'hangar_style': 'custom'}, SCHEMA).get('hangar_style') == 'compact'

    def test_the_trend_takes_at_least_one_battle(self):
        settings = Settings({'trend_battles': 0}, SCHEMA)

        assert settings.get('trend_battles') == 1

    def test_the_history_limits_are_fixed(self):
        settings = Settings({'max_entries': 9999, 'page_rows': 1}, SCHEMA)

        assert (settings.get('max_entries'), settings.get('page_rows')) == (100, 50)


class HeroTest(unittest.TestCase):

    def test_the_silhouette_fills_to_the_percent(self):
        assert widget(tank_data())['hero']['fill'] == 81.5

    def test_the_tick_marks_the_next_mark(self):
        assert widget(tank_data())['hero']['tick'] == 85.0

    def test_the_percent_history_ends_at_today(self):
        assert percent_history(80.0, [0.5, -0.25]) == [79.75, 80.25, 80.0]

    def test_one_reading_has_no_history(self):
        assert percent_history(80.0, []) == []


class PreviewTest(unittest.TestCase):

    def test_preview_text_shows_the_sample_percent(self):
        text = strip_tags(card_preview_text(Settings({}, SCHEMA), translator()))

        assert text.startswith(u'MoE 86.12%')

    def test_preview_card_shows_every_part(self):
        card = card_preview_widget(Settings({}, SCHEMA), translator())['data']

        assert card['value'] == u'86.12%'
        assert card['strip']
        assert u'Tank WN8' in [row['text'] for row in card['rows']]
        assert card['rows'][-1]['text'] == u'Т-54'


class UnratedTest(unittest.TestCase):

    def unrated(self):
        snapshot = dict(SNAPSHOT, damage_rating=0)
        return hangar_state(snapshot, ThresholdCurve.from_api(CURVE), 3000)

    def test_a_tank_without_a_dossier_rating_shows_no_zero_percent(self):
        card = widget(TankCard(self.unrated(), u'T-34'))

        assert card['value'] is None

    def test_its_next_mark_follows_the_curve(self):
        assert self.unrated()['next_level'] == 85


if __name__ == '__main__':
    unittest.main()
