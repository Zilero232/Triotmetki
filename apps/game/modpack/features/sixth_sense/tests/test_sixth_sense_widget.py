# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.sixth_sense.model import SixthSense
from otmetki.features.sixth_sense.model.preview import preview_widget
from otmetki.features.sixth_sense.model.widget import sixth_sense_widget
from otmetki.features.sixth_sense.settings import SCHEMA


def lamp_lit_at(moment, duration=10.0):
    lamp = SixthSense()
    lamp.observed(True, moment, duration)
    return lamp


def widget_data(lamp, now, **values):
    return sixth_sense_widget(lamp, Settings(values, SCHEMA), None, now)['data']


class SixthSenseWidgetTest(unittest.TestCase):

    def test_the_shipped_lamp_is_the_default_icon(self):
        data = widget_data(lamp_lit_at(100.0), 103.6)

        assert data['icon'] == 'img://gui/maps/icons/otmetki/sixth_sense/icons/lamp_64.png|otmetki:lamp'

    def test_the_ring_drains_over_the_default_duration(self):
        data = widget_data(lamp_lit_at(100.0), 103.6)

        assert data['elapsed'] == 3.6
        assert data['duration'] == 10.0

    def test_the_timer_shows_by_default(self):
        data = widget_data(lamp_lit_at(100.0), 103.6)

        assert data['timer']

    def test_the_second_half_second_is_the_dimmed_frame(self):
        data = widget_data(lamp_lit_at(100.0), 103.6)

        assert data['dim']

    def test_the_ring_drains_over_the_lamps_own_duration(self):
        data = widget_data(lamp_lit_at(100.0, 8.5), 102.0)

        assert data['elapsed'] == 2.0
        assert data['duration'] == 8.5

    def test_the_elapsed_time_stops_at_the_duration(self):
        data = widget_data(lamp_lit_at(100.0, 8.0), 130.0)

        assert data['elapsed'] == 8.0

    def test_a_lamp_past_its_time_is_held_while_spotted(self):
        data = widget_data(lamp_lit_at(100.0), 130.0)

        assert data['held'] is True

    def test_a_held_lamp_shows_no_timer(self):
        data = widget_data(lamp_lit_at(100.0), 130.0)

        assert data['timer'] is False

    def test_a_held_lamp_does_not_pulse(self):
        data = widget_data(lamp_lit_at(100.0), 130.6)

        assert data['dim'] is False

    def test_a_counting_lamp_is_not_held(self):
        data = widget_data(lamp_lit_at(100.0), 103.6)

        assert data['held'] is False

    def test_the_preview_ring_drains_as_long_as_the_stock_lamp(self):
        data = preview_widget(Settings({'hide_after_s': 6}, SCHEMA), None)['data']

        assert data['duration'] == 10.0

    def test_the_own_caption_keeps_the_icon(self):
        data = widget_data(lamp_lit_at(0.0), 1.0, text='SPOTTED')

        assert data['icon'].endswith('|otmetki:lamp')
        assert data['text'] == 'SPOTTED'

    def test_fixture_for_the_page(self):
        payload = preview_widget(Settings({}, SCHEMA), None)

        assert _support.widget_fixture('sixth_sense', payload)


if __name__ == '__main__':
    unittest.main()
