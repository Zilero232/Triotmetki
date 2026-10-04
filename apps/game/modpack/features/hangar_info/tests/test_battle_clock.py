# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import time
import unittest

import _support
from otmetki.core.format import COLOR_MUTED, format_moment, format_timer
from otmetki.core.settings import Settings
from otmetki.features.hangar_info.model.battle_clock import clock_values, format_battle_clock, timer_seconds
from otmetki.features.hangar_info.model.battle_clock.preview import preview_text, preview_widget
from otmetki.features.hangar_info.model.battle_clock.widget import clock_widget
from otmetki.features.hangar_info.settings import CLOCK_PANEL_ID, CLOCK_SCHEMA, SCHEMA

FONT_SIZE = 14


def moment():
    return time.strptime('2026-09-29 21:47:05', '%Y-%m-%d %H:%M:%S')


def info(**values):
    return Settings(values, SCHEMA)


class TimerSecondsTest(unittest.TestCase):

    def test_the_battle_timer_truncates_the_seconds_left(self):
        assert timer_seconds('battle', 1000.0, 700.2) == 299

    def test_the_prebattle_countdown_is_timed(self):
        assert timer_seconds('prebattle', 1000.0, 990.0) == 10

    def test_a_timer_past_its_end_shows_zero(self):
        assert timer_seconds('battle', 1000.0, 1200.0) == 0

    def test_an_untimed_period_has_no_timer(self):
        assert timer_seconds('afterbattle', 1000.0, 900.0) is None

    def test_an_unknown_end_has_no_timer(self):
        assert timer_seconds('battle', None, 900.0) is None


class FormatTest(unittest.TestCase):

    def test_a_timer_reads_as_minutes_and_seconds(self):
        assert format_timer(300) == '05:00'

    def test_a_timer_under_a_minute_keeps_the_zero_minutes(self):
        assert format_timer(59) == '00:59'

    def test_no_timer_reads_as_nothing(self):
        assert format_timer(None) == ''

    def test_a_moment_is_formatted_by_its_pattern(self):
        assert format_moment('%H:%M', moment()) == '21:47'


class ClockTest(unittest.TestCase):

    def test_the_clock_shows_the_time_without_the_battle_timer(self):
        values = clock_values(moment(), info(), 125)

        assert values == {'time': '21:47', 'timer': ''}

    def test_the_battle_clock_follows_the_hangar_time_format(self):
        values = clock_values(moment(), info(clock_format='%H:%M:%S'), 125)

        assert values['time'] == '21:47:05'

    def test_replacing_the_stock_timer_brings_the_battle_timer(self):
        values = clock_values(moment(), info(replace_timer=True), 125)

        assert values['timer'] == '02:05'

    def test_the_text_is_the_muted_time(self):
        text = format_battle_clock(clock_values(moment(), info(), 125), FONT_SIZE)

        assert text == '<font color="%s" size="14">21:47</font>' % COLOR_MUTED

    def test_a_replaced_timer_comes_first_in_the_text(self):
        text = format_battle_clock(clock_values(moment(), info(replace_timer=True), 125), FONT_SIZE)

        assert text.index('02:05') < text.index('21:47')


class WidgetTest(unittest.TestCase):

    def test_the_widget_carries_the_time_the_timer_and_the_clock_icon(self):
        data = clock_widget(clock_values(moment(), info(replace_timer=True), 702))['data']

        assert data == {'time': '21:47', 'timer': '11:42', 'icon': 'otmetki:clock'}

    def test_the_preview_shows_the_current_time(self):
        assert '21:47' in preview_text(info(), moment(), FONT_SIZE)

    def test_the_preview_is_a_fixture_for_the_page(self):
        assert _support.widget_fixture('battle_clock', preview_widget(info(replace_timer=True), moment()))


class SettingsTest(unittest.TestCase):

    def test_the_battle_clock_is_on_by_default(self):
        assert SCHEMA.defaults['battle_clock'] is True

    def test_the_stock_timer_stays_by_default(self):
        assert SCHEMA.defaults['replace_timer'] is False

    def test_the_battle_clock_format_and_the_font_size_are_fixed(self):
        assert 'battle_clock_format' not in SCHEMA.defaults
        assert 'font_size' not in SCHEMA.defaults
        assert info(font_size=30).get('font_size') == 14

    def test_the_panel_keeps_the_id_of_the_old_component(self):
        assert CLOCK_PANEL_ID == 'battle_clock'

    def test_the_panel_sits_left_of_the_stock_timer(self):
        place = [CLOCK_SCHEMA.defaults[key] for key in ('x', 'y', 'align_x', 'align_y')]

        assert place == [-190, 4, 'right', 'top']

    def test_the_place_under_the_timer_is_retired(self):
        assert (-8, 46, 'right', 'top') in CLOCK_SCHEMA.retired


if __name__ == '__main__':
    unittest.main()
