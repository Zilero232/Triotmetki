# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.moe import ThresholdCurve
from otmetki.core.settings import Settings
from otmetki.features.marks_panel.i18n import STRINGS
from otmetki.features.marks_panel.model import PanelView, panel_state
from otmetki.features.marks_panel.model.constants import MARK_TONES, PREVIEW_THRESHOLDS
from otmetki.features.marks_panel.model.preview import preview_state, preview_widget
from otmetki.features.marks_panel.model.widget import marks_widget
from otmetki.features.marks_panel.settings import SCHEMA


def translator():
    return _support.translator(STRINGS, 'ru')


def preview_curve():
    return ThresholdCurve.from_api(PREVIEW_THRESHOLDS)


def widget_data(values, held=False):
    view = PanelView(Settings(values, SCHEMA), held)
    return marks_widget(preview_state(view), view, translator())['data']


def curveless_widget():
    settings = Settings({}, SCHEMA)
    snapshot = {'moving_avg_damage': 2000, 'damage_rating': 5000}
    state = panel_state(snapshot, 100, None, None, settings)
    return marks_widget(state, settings, translator())['data']


def unrated_widget(curve):
    settings = Settings({}, SCHEMA)
    state = panel_state({'moving_avg_damage': 2540, 'damage_rating': 0}, 100, curve, None, settings)
    return marks_widget(state, PanelView(settings), translator())['data']


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
        assert data['battles'] is None

    def test_alt_adds_the_detail_rows(self):
        data = widget_data({'style': 'compact'}, held=True)

        assert data['style'] == 'extended'
        assert [item['level'] for item in data['thresholds']] == [65, 85, 95]

    def test_alt_changes_nothing_with_alt_details_off(self):
        data = widget_data({'style': 'compact', 'alt_detail': False}, held=True)

        assert data['thresholds'] == []

    def test_minimal_grows_on_alt_too(self):
        data = widget_data({'style': 'minimal'}, held=True)

        assert data['average'] is not None


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

        assert average == {'label': u'ср.', 'ema': 2540, 'ema_projected': 2551}

    def test_counts_the_battles_to_the_next_mark(self):
        battles = widget_data({'style': 'extended'})['battles']

        assert battles == {'level': 95, 'text': u'~45 боёв'}

    def test_switches_hide_the_rows(self):
        data = widget_data({'style': 'extended', 'show_targets': False, 'show_step': False, 'show_battles': False})

        assert data['thresholds'] == []
        assert data['step'] is None
        assert data['battles'] is None


class CustomTest(unittest.TestCase):

    def test_renders_the_template(self):
        data = widget_data({'style': 'custom', 'template': '{percent}'})

        assert data['style'] == 'custom'
        assert data['text'] == u'86.12'

    def test_an_empty_template_falls_back_to_extended(self):
        assert widget_data({'style': 'custom'})['style'] == 'extended'


class EmptyTest(unittest.TestCase):

    def test_without_a_curve_shows_the_dossier_percent(self):
        data = curveless_widget()

        assert data['has_curve'] is False
        assert data['percent'] == 50.0

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

    def test_the_default_plate_is_the_box(self):
        assert widget_data({})['look'] == 'box'

    def test_the_silhouette_style_draws_the_own_class(self):
        view = PanelView(Settings({'style': 'silhouette'}, SCHEMA))
        data = marks_widget(preview_state(view), view, translator(), 'heavyTank')['data']

        assert (data['look'], data['silhouette']) == ('silhouette', 'heavy')

    def test_an_unknown_class_draws_the_medium_silhouette(self):
        view = PanelView(Settings({'style': 'silhouette'}, SCHEMA))

        assert marks_widget(preview_state(view), view, translator(), None)['data']['silhouette'] == 'medium'

    def test_the_box_sends_no_silhouette(self):
        assert widget_data({})['silhouette'] is None

    def test_the_index_lights_the_marks_on_the_gun(self):
        assert widget_data({})['stars'] == 2

    def test_the_next_mark_is_the_scale_cursor_target(self):
        assert widget_data({})['next']['level'] == 95

    def test_the_damage_row_compares_the_battle_with_the_average(self):
        assert widget_data({})['damage'] == {'label': u'Сум. урон', 'value': 3100, 'target': 2540}

    def test_no_curve_has_no_damage_row(self):
        assert curveless_widget()['damage'] is None


class FixtureTest(unittest.TestCase):

    def test_fixture_for_the_page(self):
        payload = preview_widget(Settings({}, SCHEMA), translator())

        assert _support.widget_fixture('marks_panel', payload)


if __name__ == '__main__':
    unittest.main()
