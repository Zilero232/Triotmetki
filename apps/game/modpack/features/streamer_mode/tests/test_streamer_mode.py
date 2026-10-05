# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.streamer_mode.i18n import STRINGS
from otmetki.features.streamer_mode.model import PanelToggle, blocked_labels, hides_chat, is_player_line
from otmetki.features.streamer_mode.model.constants import HOTKEY_CHOICES, HOTKEYS, PRIVATE_HANGAR_LABELS
from otmetki.features.streamer_mode.settings import SCHEMA, SETTINGS


def settings(values=None):
    return Settings(values or {}, SCHEMA)


def hidden_toggle():
    toggle = PanelToggle()
    toggle.toggle()
    return toggle


class HotkeyTest(unittest.TestCase):

    def test_every_hotkey_choice_has_a_key(self):
        assert sorted(HOTKEYS) == sorted(HOTKEY_CHOICES)

    def test_no_hotkey_has_no_key(self):
        assert HOTKEYS['none'] == (None, ())

    def test_every_key_is_a_client_key_name(self):
        for key, _ in HOTKEYS.values():
            if key is not None:
                assert key.startswith('KEY_'), key

    def test_an_unknown_hotkey_falls_back_to_the_default(self):
        assert settings({'hotkey': 'bogus'}).get('hotkey') == 'ctrl_shift_h'


class PrivateModeTest(unittest.TestCase):

    def test_nothing_is_blocked_outside_the_private_mode(self):
        assert blocked_labels(settings()) == ()

    def test_the_private_mode_blocks_the_labels_with_own_numbers(self):
        assert blocked_labels(settings({'private': True})) == PRIVATE_HANGAR_LABELS

    def test_the_labels_stay_when_their_switch_is_off(self):
        assert blocked_labels(settings({'private': True, 'hide_hangar_stats': False})) == ()

    def test_the_private_mode_hides_the_chat_in_battle(self):
        assert hides_chat(settings({'private': True}), True)

    def test_the_chat_is_not_hidden_outside_a_battle(self):
        assert not hides_chat(settings({'private': True}), False)

    def test_the_chat_stays_when_its_switch_is_off(self):
        assert not hides_chat(settings({'private': True, 'hide_chat': False}), True)

    def test_a_line_of_another_player_can_be_hidden(self):
        assert is_player_line(4242, False)

    def test_a_line_without_a_sender_is_a_plain_message(self):
        assert not is_player_line(None, False)

    def test_a_line_of_sender_zero_is_a_plain_message(self):
        assert not is_player_line(0, False)

    def test_the_own_line_is_never_hidden(self):
        assert not is_player_line(4242, True)


class PanelToggleTest(unittest.TestCase):

    def test_the_first_press_hides_the_panels(self):
        assert PanelToggle().toggle()

    def test_a_second_press_shows_them(self):
        assert not hidden_toggle().toggle()

    def test_a_new_battle_keeps_them_hidden_when_asked(self):
        assert hidden_toggle().battle_started(True)

    def test_a_new_battle_shows_them_otherwise(self):
        assert not hidden_toggle().battle_started(False)


class SettingsTest(unittest.TestCase):

    def test_the_component_switch_is_streamer_mode(self):
        assert SETTINGS == ('streamer_mode',)

    def test_every_hotkey_has_a_label(self):
        for choice in HOTKEY_CHOICES:
            assert 'streamer_mode_hotkey_' + choice in STRINGS['ru']

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_the_hidden_notice_names_the_hotkey(self):
        text = _support.translator(STRINGS, 'en')('streamer_mode_hidden', hotkey='F9')

        assert text.endswith('(F9 brings them back)')


if __name__ == '__main__':
    unittest.main()
