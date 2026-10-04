# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.format import COLOR_DOWN, COLOR_UP
from otmetki.core.settings import Settings
from otmetki.features.battle_hotkeys.i18n import STRINGS
from otmetki.features.battle_hotkeys.model import notice_text, toggled, wanted_toggles
from otmetki.features.battle_hotkeys.model.constants import HOTKEY_CHOICES, HOTKEYS, INCREASED_ZOOM, SERVER_AIM
from otmetki.features.battle_hotkeys.model.preview import preview_text, preview_widget
from otmetki.features.battle_hotkeys.model.widget import notice_widget
from otmetki.features.battle_hotkeys.settings import SCHEMA, SETTINGS

CLIENT_KEYS = ('KEY_J', 'KEY_K', 'KEY_N', 'KEY_M', 'KEY_LCONTROL', 'KEY_LSHIFT')


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def settings(values=None):
    return Settings(values or {}, SCHEMA)


class ToggleTest(unittest.TestCase):

    def test_an_option_that_is_on_goes_off(self):
        assert toggled(True) is False

    def test_an_option_that_is_off_goes_on(self):
        assert toggled(False) is True

    def test_each_option_has_its_own_key(self):
        assert wanted_toggles(settings()) == (('ctrl_shift_j', SERVER_AIM), ('ctrl_shift_k', INCREASED_ZOOM))

    def test_a_key_can_be_left_out(self):
        assert wanted_toggles(settings({'zoom_key': 'none'}))[1] == ('none', INCREASED_ZOOM)


class HotkeyTest(unittest.TestCase):

    def test_every_hotkey_choice_has_a_key(self):
        for choice in HOTKEY_CHOICES:
            assert choice in HOTKEYS

    def test_no_hotkey_has_no_key(self):
        assert HOTKEYS['none'] == (None, ())

    def test_every_key_is_a_client_key_name(self):
        for key, modifiers in HOTKEYS.values():
            for name in ((key,) if key else ()) + modifiers:
                assert name in CLIENT_KEYS

    def test_an_unknown_hotkey_falls_back_to_the_default(self):
        assert settings({'server_aim_key': 'f13'}).get('server_aim_key') == 'ctrl_shift_j'

    def test_the_notice_time_is_fixed(self):
        assert settings({'notice_s': 60}).get('notice_s') == 2


class NoticeTest(unittest.TestCase):

    def test_the_notice_names_the_option(self):
        assert u'Серверный прицел' in notice_text(SERVER_AIM, True, settings(), translator())

    def test_an_option_turned_on_says_so_in_green(self):
        text = notice_text(INCREASED_ZOOM, True, settings(), translator('en'))

        assert u'Extended zoom' in text
        assert COLOR_UP in text

    def test_an_option_turned_off_says_so_in_red(self):
        assert COLOR_DOWN in notice_text(SERVER_AIM, False, settings(), translator())

    def test_an_option_the_client_lacks_is_unavailable(self):
        assert u'unavailable' in notice_text(SERVER_AIM, None, settings(), translator('en'))

    def test_the_preview_is_a_notice(self):
        assert u'включён' in preview_text(settings(), translator())


class WidgetTest(unittest.TestCase):

    def test_an_option_turned_on_is_good(self):
        assert notice_widget(SERVER_AIM, True, translator())['data']['tone'] == 'good'

    def test_an_option_turned_off_is_bad(self):
        assert notice_widget(SERVER_AIM, False, translator())['data']['tone'] == 'bad'

    def test_the_widget_names_the_option_and_its_state(self):
        data = notice_widget(INCREASED_ZOOM, False, translator('en'))['data']

        assert (data['option'], data['state']) == (u'Extended zoom', u'off')

    def test_the_preview_widget_matches_the_page_fixture(self):
        assert _support.widget_fixture('option_notice', preview_widget(settings(), translator()))


class SettingsTest(unittest.TestCase):

    def test_the_switch_is_battle_hotkeys(self):
        assert SETTINGS == ('battle_hotkeys',)

    def test_every_hotkey_has_a_label(self):
        for key in ('server_aim_key', 'zoom_key'):
            for choice in HOTKEY_CHOICES:
                assert 'battle_hotkeys_%s_%s' % (key, choice) in STRINGS['ru']

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
