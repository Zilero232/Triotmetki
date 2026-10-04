# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math
import unittest

import _support
from otmetki.core.format import COLOR_DOWN, COLOR_NEUTRAL, COLOR_WARN
from otmetki.core.settings import Settings
from otmetki.features.gun_arc.i18n import STRINGS
from otmetki.features.gun_arc.model import (
    arc_state,
    bar,
    format_panel,
    reticle_place,
    side_color,
    view_offset,
    yaw_label,
)
from otmetki.features.gun_arc.model.constants import BAR_CELLS, PLACEMENTS
from otmetki.features.gun_arc.model.preview import preview_text, preview_widget
from otmetki.features.gun_arc.model.widget import panel_widget
from otmetki.features.gun_arc.settings import SCHEMA, SETTINGS


LIMITS = (math.radians(-15), math.radians(15))


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def panel_text(yaw_degrees, values=None, language='ru'):
    state = arc_state(math.radians(yaw_degrees), LIMITS)
    return format_panel(state, Settings(values or {}, SCHEMA), translator(language))


class ArcTest(unittest.TestCase):

    def test_degrees_left_to_the_left_limit(self):
        state = arc_state(math.radians(5), LIMITS)

        assert round(state['left']) == 20

    def test_degrees_left_to_the_right_limit(self):
        state = arc_state(math.radians(5), LIMITS)

        assert round(state['right']) == 10

    def test_the_position_is_the_share_of_the_arc(self):
        state = arc_state(math.radians(5), LIMITS)

        assert abs(state['position'] - 20 / 30.0) < 1e-9

    def test_the_centre_is_the_hull_axis_on_the_arc(self):
        state = arc_state(0.0, (math.radians(-10), math.radians(30)))

        assert state['centre'] == 0.25

    def test_a_yaw_past_the_limit_is_held_at_it(self):
        assert arc_state(math.radians(40), LIMITS)['right'] == 0

    def test_a_turret_without_limits_has_no_readout(self):
        assert arc_state(0.2, None) is None

    def test_an_unknown_yaw_has_no_readout(self):
        assert arc_state(None, LIMITS) is None

    def test_inverted_limits_have_no_readout(self):
        assert arc_state(0.0, (0.3, -0.3)) is None


class SideColorTest(unittest.TestCase):

    def test_a_reached_limit_is_red(self):
        assert side_color(0.2, 5) == COLOR_DOWN

    def test_a_near_limit_is_a_warning(self):
        assert side_color(4, 5) == COLOR_WARN

    def test_a_far_limit_is_neutral(self):
        assert side_color(9, 5) == COLOR_NEUTRAL


class BarTest(unittest.TestCase):

    def test_the_bar_has_its_cells_between_two_ends(self):
        assert len(bar(0.5)) == BAR_CELLS + 2

    def test_the_mark_is_first_at_the_left_limit(self):
        assert bar(0.0)[1] == u'●'

    def test_the_mark_is_last_at_the_right_limit(self):
        assert bar(1.0)[-2] == u'●'


class FormatTest(unittest.TestCase):

    def test_the_panel_has_its_label(self):
        assert u'УГН' in panel_text(12)

    def test_the_panel_shows_the_degrees_to_the_left(self):
        assert u'◄ 27°' in panel_text(12)

    def test_the_panel_shows_the_degrees_to_the_right(self):
        assert u'3° ►' in panel_text(12)

    def test_a_near_limit_is_painted_as_a_warning(self):
        assert COLOR_WARN in panel_text(12)

    def test_the_bar_can_be_switched_off(self):
        assert u'●' not in panel_text(0, {'show_bar': False}, 'en')

    def test_the_degrees_stay_without_the_bar(self):
        assert u'15°' in panel_text(0, {'show_bar': False}, 'en')

    def test_no_state_has_no_panel(self):
        assert format_panel(None, Settings({}, SCHEMA), translator()) is None


def widget_data(yaw_degrees, values=None):
    state = arc_state(math.radians(yaw_degrees), LIMITS)
    return panel_widget(state, Settings(values or {}, SCHEMA))['data']


class WidgetTest(unittest.TestCase):

    def test_the_scale_carries_the_gun_position_and_the_hull_axis(self):
        data = widget_data(5)

        assert data['position'] == 0.667
        assert data['centre'] == 0.5

    def test_the_degrees_sit_at_both_ends(self):
        data = widget_data(5)

        assert [data['left'], data['right']] == [u'20°', u'10°']

    def test_a_side_at_the_warning_limit_turns_warning(self):
        data = widget_data(10)

        assert [data['left_tone'], data['right_tone']] == ['text', 'warning']

    def test_a_side_under_half_a_degree_turns_bad(self):
        data = widget_data(14.8)

        assert data['right_tone'] == 'bad'

    def test_the_gun_takes_the_tone_of_the_nearer_limit(self):
        data = widget_data(-12)

        assert data['gun_tone'] == 'warning'

    def test_the_degrees_can_be_switched_off(self):
        data = widget_data(5, {'show_degrees': False})

        assert [data['left'], data['right']] == ['', '']

    def test_the_scale_can_be_switched_off(self):
        data = widget_data(5, {'show_bar': False})

        assert data['scale'] is False

    def test_no_state_has_no_widget(self):
        assert panel_widget(None, Settings({}, SCHEMA)) is None

    def test_the_preview_is_a_fixture_for_the_page(self):
        assert _support.widget_fixture('gun_arc', preview_widget(Settings({}, SCHEMA), translator()))


class YawTest(unittest.TestCase):

    def test_the_gun_angle_is_read_from_the_hull_axis(self):
        assert round(arc_state(math.radians(-8), LIMITS)['yaw']) == -8

    def test_a_gun_to_the_right_reads_with_a_plus(self):
        assert yaw_label(12.4) == u'+12°'

    def test_a_gun_to_the_left_reads_with_a_minus(self):
        assert yaw_label(-7.6) == u'-8°'

    def test_a_gun_on_the_axis_reads_zero_without_a_sign(self):
        assert yaw_label(0.3) == u'0°'

    def test_the_panel_shows_the_gun_angle(self):
        assert u'+12°' in panel_text(12)

    def test_the_gun_angle_can_be_switched_off(self):
        assert u'+12°' not in panel_text(12, {'show_yaw': False})

    def test_the_widget_carries_the_gun_angle(self):
        assert widget_data(-8)['yaw'] == u'-8°'

    def test_the_widget_leaves_the_angle_out_when_switched_off(self):
        assert widget_data(-8, {'show_yaw': False})['yaw'] == u''


class PlacementTest(unittest.TestCase):

    def test_each_camera_mode_has_its_fixed_offset(self):
        settings = Settings({'arcade_offset': 80, 'sniper_offset': 120, 'strategic_offset': 40}, SCHEMA)

        assert [view_offset(view, settings) for view in (1, 2, 3)] == [96, 96, 64]

    def test_another_view_has_no_offset(self):
        assert view_offset(4, Settings({}, SCHEMA)) is None

    def test_the_scale_sits_under_the_reticle_by_its_offset(self):
        assert reticle_place((960, 400), (1920, 1080), 1.0, 96) == (0, -44)

    def test_the_screen_centre_is_divided_by_the_interface_scale(self):
        assert reticle_place((640, 360), (1920, 1080), 1.5, 50) == (0, 50)

    def test_the_scale_follows_the_reticle_by_default(self):
        assert Settings({}, SCHEMA).get('placement') == 'reticle'

    def test_every_placement_has_a_label(self):
        for placement in PLACEMENTS:
            assert 'gun_arc_placement_' + placement in STRINGS['ru']

    def test_the_warning_threshold_is_fixed(self):
        assert Settings({'warn_deg': 20}, SCHEMA).get('warn_deg') == 5


class SettingsTest(unittest.TestCase):

    def test_the_preview_is_a_panel(self):
        assert u'УГН' in preview_text(Settings({}, SCHEMA), translator())

    def test_the_scale_sits_under_the_reticle(self):
        place = [SCHEMA.defaults[key] for key in ('x', 'y', 'align_x', 'align_y')]

        assert place == [0, 96, 'center', 'center']

    def test_the_component_switch_is_battle_gun_arc(self):
        assert SETTINGS == ('battle_gun_arc',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
