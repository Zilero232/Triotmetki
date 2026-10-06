# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math
import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.gun_arc.i18n import STRINGS
from otmetki.features.gun_arc.model import (
    marker_offsets,
    reticle_offset,
    screen_offset,
    screen_size,
    sector_angles,
    sector_points,
)
from otmetki.features.gun_arc.model.constants import CANVAS, CENTRE_MARKERS, MARKERS, MIN_DISTANCE_M
from otmetki.features.gun_arc.model.preview import preview_text, preview_widget
from otmetki.features.gun_arc.model.widget import empty_widget, panel_widget
from otmetki.features.gun_arc.settings import ADVANCED, SCHEMA, SETTINGS

LIMITS = (math.radians(-10), math.radians(30))
PIVOT = (100.0, 5.0, 200.0)
AIM_AHEAD = (100.0, 7.0, 500.0)


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def settings(**values):
    return Settings(values, SCHEMA)


def rounded(point):
    return tuple(round(part, 3) for part in point)


class SectorAnglesTest(unittest.TestCase):

    def test_the_limits_come_left_then_right(self):
        left, right, _ = sector_angles(LIMITS)

        assert (round(math.degrees(left)), round(math.degrees(right))) == (-10, 30)

    def test_the_centre_is_the_middle_of_the_sector_not_the_hull_axis(self):
        _, _, centre = sector_angles(LIMITS)

        assert round(math.degrees(centre)) == 10

    def test_a_turret_without_limits_has_no_sector(self):
        assert sector_angles(None) is None

    def test_inverted_limits_have_no_sector(self):
        assert sector_angles((0.3, -0.3)) is None


class SectorPointsTest(unittest.TestCase):

    def test_a_limit_point_is_as_far_out_as_the_gun_marker(self):
        points = sector_points(PIVOT, 0.0, AIM_AHEAD, LIMITS)

        distance = math.hypot(points['right'][0] - PIVOT[0], points['right'][2] - PIVOT[2])
        assert round(distance, 6) == 300.0

    def test_a_limit_point_takes_the_gun_marker_height(self):
        points = sector_points(PIVOT, 0.0, AIM_AHEAD, LIMITS)

        assert points['left'][1] == AIM_AHEAD[1]

    def test_the_right_limit_turns_towards_plus_x(self):
        points = sector_points(PIVOT, 0.0, AIM_AHEAD, LIMITS)

        assert points['right'][0] > PIVOT[0]

    def test_the_left_limit_turns_towards_minus_x(self):
        points = sector_points(PIVOT, 0.0, AIM_AHEAD, LIMITS)

        assert points['left'][0] < PIVOT[0]

    def test_the_hull_yaw_turns_the_whole_sector(self):
        points = sector_points(PIVOT, math.radians(90), AIM_AHEAD, (math.radians(-10), math.radians(10)))

        assert rounded(points['centre']) == rounded((PIVOT[0] + 300.0, AIM_AHEAD[1], PIVOT[2]))

    def test_a_gun_marker_at_the_tank_keeps_the_limits_out(self):
        points = sector_points(PIVOT, 0.0, (100.0, 5.0, 205.0), LIMITS)

        distance = math.hypot(points['centre'][0] - PIVOT[0], points['centre'][2] - PIVOT[2])
        assert round(distance, 6) == MIN_DISTANCE_M

    def test_no_sector_has_no_points(self):
        assert sector_points(PIVOT, 0.0, AIM_AHEAD, None) is None

    def test_an_unknown_gun_marker_has_no_points(self):
        assert sector_points(PIVOT, 0.0, None, LIMITS) is None


class ScreenTest(unittest.TestCase):

    def test_the_clip_space_centre_is_the_screen_centre(self):
        assert screen_offset((0.0, 0.0, 0.5, 2.0), (1920, 1080)) == (0.0, 0.0)

    def test_the_right_edge_is_half_the_screen_width_out(self):
        assert screen_offset((2.0, 0.0, 0.5, 2.0), (1920, 1080)) == (960.0, 0.0)

    def test_up_in_clip_space_is_up_on_the_screen(self):
        assert screen_offset((0.0, 1.0, 0.5, 2.0), (1920, 1080)) == (0.0, -270.0)

    def test_a_point_behind_the_camera_is_not_on_the_screen(self):
        assert screen_offset((0.2, 0.1, 0.5, -1.0), (1920, 1080)) is None

    def test_the_screen_is_measured_in_design_px(self):
        assert screen_size((2560, 1440), 1.5) == (2560 / 1.5, 1440 / 1.5)

    def test_the_reticle_offset_is_from_the_screen_centre(self):
        assert reticle_offset((960, 400), (1920, 1080), 1.0) == (0.0, -140.0)


class MarkerOffsetsTest(unittest.TestCase):

    def test_a_marker_sits_at_its_offset_from_the_reticle(self):
        marks = marker_offsets({'left': (-200.4, -138.0)}, (0.0, -140.0))

        assert marks['left'] == (-200, 2)

    def test_a_marker_off_the_canvas_is_left_out(self):
        marks = marker_offsets({'right': (CANVAS[0] / 2.0 + 1, 0.0)}, (0.0, 0.0))

        assert marks['right'] is None

    def test_a_marker_behind_the_camera_is_left_out(self):
        marks = marker_offsets({'left': None}, (0.0, 0.0))

        assert marks['left'] is None

    def test_no_points_leave_every_marker_out(self):
        assert marker_offsets(None, (0.0, 0.0)) == {'left': None, 'right': None, 'centre': None}


class WidgetTest(unittest.TestCase):

    def test_the_widget_carries_both_limit_markers_and_their_style(self):
        data = panel_widget({'left': (-120, 0), 'right': (80, 2), 'centre': None}, settings())['data']

        assert data['marker'] == 'corner'
        assert (data['left'], data['right']) == ({'x': -120, 'y': 0}, {'x': 80, 'y': 2})

    def test_the_centre_marker_is_off_by_default(self):
        data = panel_widget({'left': (-120, 0), 'right': (80, 2), 'centre': (-20, 1)}, settings())['data']

        assert data['centre'] is None

    def test_a_centre_style_shows_the_centre_marker(self):
        data = panel_widget({'left': None, 'right': None, 'centre': (-20, 1)}, settings(centre_marker='dot'))['data']

        assert (data['centre_marker'], data['centre']) == ('dot', {'x': -20, 'y': 1})

    def test_no_marker_on_the_screen_has_no_widget(self):
        assert panel_widget({'left': None, 'right': None, 'centre': None}, settings()) is None

    def test_the_empty_panel_draws_no_marker(self):
        data = empty_widget(settings(centre_marker='dot'))['data']

        assert (data['left'], data['right'], data['centre']) == (None, None, None)

    def test_the_empty_panel_keeps_the_marker_style(self):
        data = empty_widget(settings(marker='octagon'))['data']

        assert data['marker'] == 'octagon'

    def test_the_preview_is_a_fixture_for_the_page(self):
        assert _support.widget_fixture('gun_arc', preview_widget(settings(), translator()))


class SettingsTest(unittest.TestCase):

    def test_the_default_marker_is_the_first_style_as_in_gun_constraints(self):
        assert SCHEMA.defaults['marker'] == MARKERS[0]

    def test_there_is_no_centre_marker_by_default(self):
        assert SCHEMA.defaults['centre_marker'] == 'none'

    def test_the_faster_redraw_is_off_and_advanced(self):
        assert SCHEMA.defaults['fast_redraw'] is False
        assert 'fast_redraw' in ADVANCED

    def test_every_style_has_a_label_in_both_languages(self):
        keys = ['gun_arc_marker_' + name for name in MARKERS]
        keys.extend('gun_arc_centre_marker_' + name for name in CENTRE_MARKERS)

        for key in keys:
            for language in ('ru', 'en'):
                assert key in STRINGS[language], (language, key)

    def test_the_old_scale_settings_are_gone(self):
        retired = ('show_bar', 'show_degrees', 'show_yaw', 'placement', 'warn_deg')

        assert not set(retired) & set(SCHEMA.defaults)

    def test_the_markers_follow_the_reticle_and_are_not_dragged(self):
        assert settings().get('drag') is False

    def test_a_panel_left_at_the_old_scale_place_moves(self):
        assert (0, 96, 'center', 'center') in SCHEMA.retired

    def test_the_preview_text_names_the_component(self):
        assert u'УГН' in preview_text(settings(), translator())

    def test_the_component_switch_is_battle_gun_arc(self):
        assert SETTINGS == ('battle_gun_arc',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
