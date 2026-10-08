# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.bush_circle.i18n import STRINGS
from otmetki.features.bush_circle.model import CircleState, color_of, diameter
from otmetki.features.bush_circle.model.constants import COLOR_CHOICES, HOTKEY_CHOICES, HOTKEYS, RADIUS_M
from otmetki.features.bush_circle.settings import CHOICES, SCHEMA, SETTINGS


def toggled_state():
    state = CircleState('hotkey')
    state.toggle()
    return state


class HotkeyModeTest(unittest.TestCase):

    def test_the_circle_starts_hidden(self):
        assert not CircleState('hotkey').wanted()

    def test_the_hotkey_toggle_is_accepted(self):
        assert CircleState('hotkey').toggle()

    def test_the_hotkey_shows_the_circle(self):
        state = toggled_state()

        assert state.wanted()

    def test_a_second_press_hides_the_circle(self):
        state = toggled_state()

        state.toggle()

        assert not state.wanted()


class AlwaysModeTest(unittest.TestCase):

    def test_the_circle_is_shown_from_the_start(self):
        assert CircleState('always').wanted()

    def test_the_hotkey_is_refused(self):
        assert not CircleState('always').toggle()

    def test_the_hotkey_keeps_the_circle_shown(self):
        state = CircleState('always')

        state.toggle()

        assert state.wanted()


class DestroyedTankTest(unittest.TestCase):

    def test_the_first_kill_is_a_change(self):
        assert CircleState('always').killed()

    def test_a_second_kill_is_no_change(self):
        state = CircleState('always')
        state.killed()

        assert not state.killed()

    def test_the_circle_is_gone_once_the_tank_is_destroyed(self):
        state = CircleState('always')

        state.killed()

        assert not state.wanted()


class RespawnTest(unittest.TestCase):

    def test_a_respawned_tank_has_its_circle_again(self):
        state = CircleState('always')
        state.killed()

        state.respawned()

        assert state.wanted()

    def test_a_respawn_after_a_kill_is_a_change(self):
        state = CircleState('always')
        state.killed()

        assert state.respawned()

    def test_a_respawn_of_a_living_tank_is_no_change(self):
        assert not CircleState('always').respawned()


class ValuesTest(unittest.TestCase):

    def test_the_radius_is_the_games_15_m(self):
        assert RADIUS_M == 15.0

    def test_the_diameter_is_twice_the_radius(self):
        assert diameter() == 30.0

    def test_a_colour_is_its_argb_value(self):
        assert color_of('green') == 0xFF7CD35B

    def test_an_unknown_colour_is_white(self):
        assert color_of('purple') == 0xFFFFFFFF

    def test_every_hotkey_choice_has_a_key(self):
        assert sorted(HOTKEYS) == sorted(HOTKEY_CHOICES)

    def test_no_hotkey_has_no_key(self):
        assert HOTKEYS['none'] == (None, ())

    def test_the_settings_offer_every_colour(self):
        for color in COLOR_CHOICES:
            assert color in CHOICES['color']

    def test_the_settings_offer_the_hotkey_choices(self):
        assert CHOICES['hotkey'] == HOTKEY_CHOICES


class SettingsTest(unittest.TestCase):

    def test_a_retired_f7_moves_to_the_default_hotkey(self):
        assert Settings({'hotkey': 'f7'}, SCHEMA).get('hotkey') == 'ctrl_shift_b'

    def test_a_retired_f8_moves_to_the_default_hotkey(self):
        assert Settings({'hotkey': 'f8'}, SCHEMA).get('hotkey') == 'ctrl_shift_b'

    def test_no_choice_is_a_stock_chat_key(self):
        assert 'f7' not in HOTKEY_CHOICES

    def test_the_component_switch_is_battle_bush_circle(self):
        assert SETTINGS == ('battle_bush_circle',)

    def test_the_default_mode_is_the_hotkey(self):
        assert SCHEMA.defaults['mode'] == 'hotkey'

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_every_choice_has_a_label(self):
        for key, values in CHOICES.items():
            for value in values:
                assert 'bush_circle_%s_%s' % (key, value) in STRINGS['ru']


if __name__ == '__main__':
    unittest.main()
