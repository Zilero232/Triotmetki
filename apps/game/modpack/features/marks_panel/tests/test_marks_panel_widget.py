# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.moe import ThresholdCurve
from otmetki.core.settings import Settings
from otmetki.features.marks_panel.i18n import STRINGS
from otmetki.features.marks_panel.model import panel_state
from otmetki.features.marks_panel.model.constants import MARK_TONES, PREVIEW_THRESHOLDS
from otmetki.features.marks_panel.model.preview import preview_state, preview_widget
from otmetki.features.marks_panel.model.widget import marks_widget
from otmetki.features.marks_panel.settings import SCHEMA


def translator():
    return _support.translator(STRINGS, 'ru')


def preview_curve():
    return ThresholdCurve.from_api(PREVIEW_THRESHOLDS)


def widget_data(values):
    settings = Settings(values, SCHEMA)
    return marks_widget(preview_state(settings), settings, translator())['data']


def curveless_widget():
    settings = Settings({}, SCHEMA)
    snapshot = {'moving_avg_damage': 2000, 'damage_rating': 0}
    state = panel_state(snapshot, 100, None, None, settings)
    return marks_widget(state, settings, translator())['data']


def estimated_widget(combined=100, values=None):
    settings = Settings(values or {}, SCHEMA)
    snapshot = {'moving_avg_damage': 2000, 'damage_rating': 5000}
    state = panel_state(snapshot, combined, None, None, settings)
    return marks_widget(state, settings, translator())['data']


def unrated_widget(curve):
    settings = Settings({}, SCHEMA)
    state = panel_state({'moving_avg_damage': 2540, 'damage_rating': 0}, 100, curve, None, settings)
    return marks_widget(state, settings, translator())['data']


class MainRowTest(unittest.TestCase):

    def test_shows_the_projected_percent_and_the_mark(self):
        data = widget_data({})

        assert data['percent'] == 86.3
        assert data['delta'] == 0.18
        assert data['mark'] == 'img://gui/maps/icons/library/marksOnGun/mark_2.png|otmetki:target'

    def test_colour_by_change_keeps_the_percent_white(self):
        assert widget_data({'color_mode': 'delta'})['tone'] == 'text'

    def test_colour_off_keeps_the_text_tone(self):
        assert widget_data({'color_mode': 'off'})['tone'] == 'text'

    def test_colour_by_mark_follows_the_levels_passed(self):
        assert widget_data({'color_mode': 'mark'})['tone'] == MARK_TONES[2]

    def test_the_goal_is_the_next_whole_percent(self):
        assert widget_data({})['goal'] == {'level': 87, 'need': 2107}

    def test_without_the_whole_percent_the_goal_is_the_next_mark(self):
        assert widget_data({'show_up': False})['goal'] == {'level': 95, 'need': 25195}

    def test_minimal_has_no_goal(self):
        assert widget_data({'style': 'minimal'})['goal'] is None

    def test_a_verified_percent_is_not_approximate(self):
        assert widget_data({})['estimated'] is False

    def test_an_estimated_percent_is_approximate(self):
        assert unrated_widget(preview_curve())['estimated'] is True


class CompactTest(unittest.TestCase):

    def test_compact_rests_on_the_main_row(self):
        data = widget_data({'style': 'compact'})

        assert data['thresholds'] == []
        assert data['step'] is None
        assert data['average'] is None

    def test_minimal_has_no_detail_rows(self):
        data = widget_data({'style': 'minimal'})

        assert (data['thresholds'], data['step'], data['average']) == ([], None, None)

    def test_the_preview_is_the_compact_panel_the_player_places(self):
        data = preview_widget(Settings({}, SCHEMA), translator())['data']

        assert (data['style'], data['thresholds'], data['step'], data['average']) == ('compact', [], None, None)


class ExtendedTest(unittest.TestCase):

    def test_lists_the_thresholds_up_to_the_next_mark(self):
        data = widget_data({'style': 'extended'})

        assert data['thresholds'] == [
            {'level': 65, 'need': 0, 'reached': True},
            {'level': 85, 'need': 0, 'reached': True},
            {'level': 95, 'need': 25195, 'reached': False},
        ]

    def test_shows_the_step(self):
        assert widget_data({'style': 'extended'})['step'] == {'step': 0.5, 'need': 955}

    def test_shows_the_average_before_and_after(self):
        average = widget_data({'style': 'extended'})['average']

        assert average == {'label': u'среднее', 'ema': 2540, 'ema_projected': 2551}

    def test_leaves_the_battles_to_the_next_mark_to_the_tank_card(self):
        assert 'battles' not in widget_data({'style': 'extended'})

    def test_switches_hide_the_rows(self):
        data = widget_data({'style': 'extended', 'show_targets': False, 'show_step': False})

        assert data['thresholds'] == []
        assert data['step'] is None


class CustomTest(unittest.TestCase):

    def test_renders_the_template(self):
        data = widget_data({'style': 'custom', 'template': '{percent}'})

        assert data['style'] == 'custom'
        assert data['text'] == u'86.12'

    def test_an_empty_template_falls_back_to_extended(self):
        assert widget_data({'style': 'custom'})['style'] == 'extended'


class EstimateTest(unittest.TestCase):

    def test_without_the_site_curve_the_panel_projects(self):
        data = estimated_widget(combined=3500)

        assert data['has_curve'] is True
        assert data['delta'] > 0
        assert data['percent'] > 50.0

    def test_the_projection_is_marked_as_an_estimate(self):
        assert estimated_widget()['estimated'] is True

    def test_the_goal_has_its_damage(self):
        goal = estimated_widget()['goal']

        assert goal['level'] == 51
        assert goal['need'] > 0


class BarTest(unittest.TestCase):

    def test_the_bar_ends_at_the_damage_for_the_goal(self):
        data = widget_data({})

        assert data['bar'] == {'value': 3100, 'hold': 2540, 'end': 3100 + 2107}

    def test_a_reached_goal_fills_the_bar(self):
        data = estimated_widget(combined=9000)

        assert data['bar']['end'] == data['bar']['value'] == 9000

    def test_the_percent_bar_sends_no_damage_bar(self):
        assert widget_data({'bar': 'percent'})['bar'] is None

    def test_no_curve_has_no_bar(self):
        assert curveless_widget()['bar'] is None

    def test_the_goal_prefix_comes_translated(self):
        assert widget_data({})['to'] == u'до'


class EmptyTest(unittest.TestCase):

    def test_without_a_percent_nor_a_curve_nothing_is_projected(self):
        data = curveless_widget()

        assert data['has_curve'] is False
        assert data['percent'] is None

    def test_without_a_curve_no_thresholds_note_is_drawn(self):
        assert curveless_widget()['note'] is None

    def test_without_a_curve_the_thresholds_row_is_hidden(self):
        assert curveless_widget()['thresholds'] == []

    def test_without_a_curve_the_average_moves_with_the_battle(self):
        average = curveless_widget()['average']

        assert (average['ema'], average['ema_projected']) == (2000, 1962)

    def test_without_a_curve_there_is_no_goal(self):
        assert curveless_widget()['goal'] is None


class LookTest(unittest.TestCase):

    def test_the_battle_plate_draws_no_tank_silhouette(self):
        assert 'silhouette' not in widget_data({})

    def test_a_stored_silhouette_style_falls_back_to_compact(self):
        assert Settings({'style': 'silhouette'}, SCHEMA).get('style') == 'compact'

    def test_the_index_lights_the_marks_on_the_gun(self):
        assert widget_data({})['stars'] == 2

    def test_the_damage_row_compares_the_battle_with_the_average(self):
        assert widget_data({})['damage'] == {'label': u'урон', 'value': 3100, 'target': 2540}

    def test_no_curve_has_no_damage_row(self):
        assert curveless_widget()['damage'] is None


class FixtureTest(unittest.TestCase):

    def test_fixture_for_the_page(self):
        payload = preview_widget(Settings({}, SCHEMA), translator())

        assert _support.widget_fixture('marks_panel', payload)


if __name__ == '__main__':
    unittest.main()
