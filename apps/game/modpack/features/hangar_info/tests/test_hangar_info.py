# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import time
import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.hangar_info.i18n import STRINGS
from otmetki.features.hangar_info.model import armor_actions, format_info, format_widget, layout_of, tank_slug
from otmetki.features.hangar_info.model.constants import PING_BAD_COLOR, PING_GOOD_COLOR, PING_NORM_COLOR
from otmetki.features.hangar_info.model.ping import ping_color, ping_tone, valid_ping
from otmetki.features.hangar_info.settings import SCHEMA, SETTINGS

NOW = time.mktime((2026, 9, 27, 18, 5, 9, 0, 0, -1))
INFO = {'server': 'RU4', 'ping': 42, 'online': '81 234', 'region_online': None}


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def settings(**values):
    return Settings(values, SCHEMA)


class TankSlugTest(unittest.TestCase):

    def test_the_slug_is_the_lower_case_tag(self):
        assert tank_slug('ussr:R45_IS-7') == 'r45-is-7'
        assert tank_slug(u'uk:GB83_FV4005') == 'gb83-fv4005'

    def test_underscores_become_dashes(self):
        assert tank_slug('china:Ch41_WZ_111_5A') == 'ch41-wz-111-5a'

    def test_apostrophes_are_dropped(self):
        assert tank_slug("usa:A13_T110E5'") == 'a13-t110e5'

    def test_an_ampersand_becomes_and(self):
        assert tank_slug('germany:G_Tiger&Co') == 'g-tiger-and-co'

    def test_no_slug_without_a_tag(self):
        assert tank_slug('') is None
        assert tank_slug(None) is None


class ArmorActionTest(unittest.TestCase):

    def test_armour_link_uses_the_site_slug_of_the_tag(self):
        action = armor_actions('ussr:R04_T-34', translator())[0]

        assert action == {'id': 'armor', 'label': u'Броня на сайте', 'link': '/t/r04-t-34/armor', 'confirm': None}

    def test_no_armour_link_without_a_vehicle(self):
        assert armor_actions(None, translator()) == []


class PanelTest(unittest.TestCase):

    def test_default_panel(self):
        text = format_info(INFO, settings(), translator(), NOW)

        assert '18:05' in text
        assert '27.09' in text
        assert 'RU4' in text
        assert u'42 мс' in text
        assert '81 234' in text
        assert PING_GOOD_COLOR in text

    def test_switches_and_missing_values(self):
        switches = settings(show_server=False, show_online=False, date_format='')

        text = format_info({'server': 'RU4', 'ping': -1}, switches, translator('en'), NOW)

        assert text.count('\n') == 0
        assert '18:05' in text
        assert 'RU4' not in text
        assert 'ms' not in text

    def test_template(self):
        template = settings(template='{time} {server} {ping} {{x}')

        text = format_info(INFO, template, translator('en'), NOW)

        assert text == '18:05 RU4 42 ms {x}'


class WidgetTest(unittest.TestCase):

    def test_the_strip_carries_the_time_and_the_date(self):
        data = format_widget(INFO, settings(), translator(), NOW)['data']

        assert data['time'] == '18:05'
        assert data['date'] == '27.09'

    def test_the_strip_carries_the_server_and_the_online_count(self):
        data = format_widget(INFO, settings(), translator(), NOW)['data']

        assert data['server'] == 'RU4'
        assert data['online'] == '81 234'
        assert data['online_label'] == u'онлайн'

    def test_the_ping_takes_the_band_tone(self):
        data = format_widget(dict(INFO, ping=80), settings(), translator(), NOW)['data']

        assert data['ping'] == u'80 мс'
        assert data['ping_tone'] == 'warning'

    def test_switched_off_values_are_empty(self):
        switches = settings(show_server=False, show_ping=False, show_online=False)

        data = format_widget(INFO, switches, translator(), NOW)['data']

        assert [data['server'], data['ping'], data['online'], data['online_label']] == ['', '', '', '']

    def test_no_strip_with_a_custom_template(self):
        assert format_widget(INFO, settings(template='{time}'), translator(), NOW) is None

    def test_the_strip_is_a_fixture_for_the_page(self):
        assert _support.widget_fixture('clock_strip', format_widget(INFO, settings(), translator(), NOW))


class PingTest(unittest.TestCase):

    def test_a_negative_ping_is_invalid(self):
        assert valid_ping(-1) is None

    def test_no_ping_is_invalid(self):
        assert valid_ping(None) is None

    def test_a_valid_ping_is_whole_milliseconds(self):
        assert valid_ping(80.4) == 80

    def test_ping_colours_follow_the_client_bands(self):
        assert ping_color(10) == PING_GOOD_COLOR
        assert ping_color(59) == PING_GOOD_COLOR
        assert ping_color(119) == PING_NORM_COLOR
        assert ping_color(200) == PING_BAD_COLOR

    def test_ping_tones_follow_the_client_bands(self):
        assert ping_tone(None) == 'muted'
        assert ping_tone(59) == 'good'
        assert ping_tone(60) == 'warning'
        assert ping_tone(120) == 'bad'


class SettingsTest(unittest.TestCase):

    def test_an_unknown_clock_format_falls_back_to_the_default(self):
        assert settings(clock_format='%s').get('clock_format') == '%H:%M'

    def test_the_date_shows_the_day_and_the_month_by_default(self):
        assert settings().get('date_format') == '%d.%m'

    def test_layout_clamps_the_position(self):
        layout = layout_of(settings(x=99999, align_x='middle'))

        assert layout == {'x': 4000, 'y': 83, 'alignX': 'left', 'alignY': 'top', 'scale': 1.0}

    def test_the_strip_sits_top_left_under_the_header(self):
        layout = layout_of(settings())

        assert layout == {'x': 50, 'y': 83, 'alignX': 'left', 'alignY': 'top', 'scale': 1.0}

    def test_the_config_switch(self):
        assert SETTINGS == ('hangar_info',)

    def test_strings_in_sync(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
