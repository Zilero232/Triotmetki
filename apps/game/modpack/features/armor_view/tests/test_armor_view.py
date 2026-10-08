# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.armor_view.i18n import STRINGS
from otmetki.features.armor_view.model import armor_url, is_menu_option, refusal, shows_menu_option, site_locale
from otmetki.features.armor_view.settings import DEFAULTS, GROUP, SCHEMA, SETTINGS, SWITCH

TANK_ID = 2849


def settings(**values):
    return Settings(values, SCHEMA)


class ArmorUrlTest(unittest.TestCase):

    def test_the_default_locale_has_no_prefix(self):
        assert armor_url(TANK_ID, 'ru') == 'https://triotmetki.ru/t/2849/armor'

    def test_english_has_its_prefix(self):
        assert armor_url(TANK_ID, 'en') == 'https://triotmetki.ru/en/t/2849/armor'

    def test_an_unknown_language_opens_the_default_locale(self):
        assert site_locale('de') == 'ru'
        assert site_locale(None) == 'ru'

    def test_no_tank_means_no_link(self):
        assert armor_url(None, 'ru') is None
        assert armor_url(0, 'ru') is None
        assert armor_url(True, 'ru') is None
        assert armor_url('2849', 'ru') is None


class RefusalTest(unittest.TestCase):

    def test_a_selected_tank_in_the_hangar_opens(self):
        assert refusal(True, False, TANK_ID) is None

    def test_the_switch_off_refuses_first(self):
        assert refusal(False, True, None) == 'armor_view_off'

    def test_a_battle_refuses(self):
        assert refusal(True, True, TANK_ID) == 'armor_view_in_battle'

    def test_no_tank_refuses(self):
        assert refusal(True, False, None) == 'armor_view_no_tank'

    def test_every_refusal_has_a_text(self):
        keys = ('armor_view_off', 'armor_view_in_battle', 'armor_view_no_tank')

        assert all(key in STRINGS['ru'] for key in keys)


class MenuOptionTest(unittest.TestCase):

    def test_the_carousel_menu_gets_the_option_by_default(self):
        assert shows_menu_option(True, False, settings(), TANK_ID) is True

    def test_the_option_can_be_switched_off(self):
        assert shows_menu_option(True, False, settings(context_menu=False), TANK_ID) is False

    def test_no_option_in_battle_or_switched_off(self):
        assert shows_menu_option(True, True, settings(), TANK_ID) is False
        assert shows_menu_option(False, False, settings(), TANK_ID) is False

    def test_only_our_option_id_is_ours(self):
        assert is_menu_option('otmetki_armor_view') is True
        assert is_menu_option('vehicleInfo') is False


class DescriptorTest(unittest.TestCase):

    def test_both_languages_have_the_same_keys(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_the_config_switch(self):
        assert SETTINGS == (SWITCH,)
        assert SWITCH == 'hangar_armor_view'

    def test_it_opens_in_the_game_by_default(self):
        assert DEFAULTS == {'context_menu': True, 'open_in': 'game'}

    def test_the_settings_group(self):
        assert GROUP == 'hangar'


if __name__ == '__main__':
    unittest.main()
