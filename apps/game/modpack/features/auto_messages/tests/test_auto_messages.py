# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.auto_messages.i18n import STRINGS
from otmetki.features.auto_messages.model import (
    AutoMessages,
    crossed,
    device_trigger,
    hp_percent,
    is_last_alive,
    is_low_hp,
    is_shot,
    is_spotted_alert,
    received_trigger,
    reload_seconds,
    render,
    round_result,
    variants,
)
from otmetki.features.auto_messages.model.constants import (
    COOLDOWNS,
    DEFAULT_ON,
    MAX_LINE_CHARS,
    PLACEHOLDER,
    TRIGGERS,
)
from otmetki.features.auto_messages.settings import SCHEMA

EMOJI_START = 0x2600


def first(options):
    return options[0]


def messages(**values):
    settings = Settings(values, SCHEMA)
    return AutoMessages(settings, _support.translator(STRINGS, 'ru'), choose=first)


class TextTest(unittest.TestCase):

    def test_variants_split_on_the_bar(self):
        assert variants(' Горю! | Пожар! ') == ['Горю!', 'Пожар!']

    def test_empty_variants_are_dropped(self):
        assert variants('a||  |b') == ['a', 'b']

    def test_nothing_gives_no_variants(self):
        assert variants(None) == []

    def test_render_fills_placeholders(self):
        assert render('Арта ({vehicle}) по мне', {'vehicle': 'M53/M55'}) == 'Арта (M53/M55) по мне'

    def test_render_drops_an_unknown_value(self):
        assert render('{hp} ХП', {}) == 'ХП'

    def test_render_cuts_to_the_chat_limit(self):
        assert len(render('x' * 500, {})) == MAX_LINE_CHARS


class TriggerTest(unittest.TestCase):

    def test_an_enemy_spg_shot_is_arty(self):
        assert received_trigger('shot', 'SPG', True, False) == 'arty_hit'

    def test_an_enemy_tank_shot_says_nothing(self):
        assert received_trigger('shot', 'heavyTank', True, False) is None

    def test_an_enemy_ram_is_ramming(self):
        assert received_trigger('ram', 'SPG', True, False) == 'rammed'

    def test_an_ally_shot_is_team_damage(self):
        assert received_trigger('shot', 'mediumTank', False, True) == 'team_damage'

    def test_an_ally_ram_is_team_damage(self):
        assert received_trigger('ram', 'mediumTank', False, True) == 'team_damage'

    def test_world_damage_says_nothing(self):
        assert received_trigger('world', None, False, True) is None

    def test_an_unknown_attacker_says_nothing(self):
        assert received_trigger('shot', 'SPG', False, False) is None

    def test_a_critical_ammo_rack(self):
        assert device_trigger('ammoBay', 'critical') == 'ammo_rack'

    def test_a_crew_member_knocked_out(self):
        assert device_trigger('gunner1', 'destroyed') == 'crew'

    def test_a_track_knocked_out(self):
        assert device_trigger('leftTrack0', 'destroyed') == 'tracks'

    def test_a_critical_track_says_nothing(self):
        assert device_trigger('rightTrack0', 'critical') is None

    def test_a_repaired_device_says_nothing(self):
        assert device_trigger('ammoBay', 'normal') is None

    def test_low_hp_at_the_threshold(self):
        assert is_low_hp(250, 1000, 25)

    def test_low_hp_above_the_threshold(self):
        assert not is_low_hp(260, 1000, 25)

    def test_a_destroyed_tank_is_not_low_hp(self):
        assert not is_low_hp(0, 1000, 25)

    def test_an_unknown_maximum_is_not_low_hp(self):
        assert not is_low_hp(100, None, 25)

    def test_hp_percent(self):
        assert hp_percent(250, 1000) == 25

    def test_a_fresh_long_reload(self):
        assert reload_seconds(20.4, 20.4, 15) == 20

    def test_a_short_reload_says_nothing(self):
        assert reload_seconds(8.0, 8.0, 15) is None

    def test_a_reload_already_running_says_nothing(self):
        assert reload_seconds(16.0, 20.0, 15) is None

    def test_a_milestone_crossed(self):
        assert crossed(1800, 2100, 2000)

    def test_a_milestone_already_passed(self):
        assert not crossed(2100, 2500, 2000)

    def test_a_draw(self):
        assert round_result(0, 1) == 'draw'

    def test_a_win(self):
        assert round_result(1, 1) == 'win'

    def test_a_defeat(self):
        assert round_result(2, 1) == 'defeat'

    def test_last_alive(self):
        assert is_last_alive(True, 0, 15)

    def test_alone_from_the_start_is_not_last_alive(self):
        assert not is_last_alive(True, 0, 1)

    def test_spotted_with_few_allies(self):
        assert is_spotted_alert(5, 5)

    def test_spotted_with_many_allies_stays_silent(self):
        assert not is_spotted_alert(6, 5)


class AutoMessagesTest(unittest.TestCase):

    def test_the_default_arty_line(self):
        line = messages().compose('arty_hit', {'vehicle': 'M53/M55', 'hit': 400}, 0)

        assert line == 'Арта (M53/M55) отстрелялась! По мне :O'

    def test_the_players_text_wins(self):
        line = messages(arty_hit_text='Арта {vehicle}!').compose('arty_hit', {'vehicle': 'FV304'}, 0)

        assert line == 'Арта FV304!'

    def test_a_trigger_off_says_nothing(self):
        assert messages().compose('fire', {}, 0) is None

    def test_a_trigger_turned_on_speaks(self):
        assert messages(fire=True).compose('fire', {}, 0) == 'Горю!'

    def test_the_cooldown_holds_a_trigger(self):
        auto = messages()
        auto.record('arty_hit', 0)

        assert auto.compose('arty_hit', {}, 20) is None

    def test_the_cooldown_ends(self):
        auto = messages()
        auto.record('arty_hit', 0)

        assert auto.compose('arty_hit', {}, 30) is not None

    def test_a_once_trigger_never_repeats(self):
        auto = messages(gg=True)
        auto.record('gg', 0)

        assert auto.compose('gg', {}, 3600) is None

    def test_the_global_pause_holds_another_trigger(self):
        auto = messages()
        auto.record('arty_hit', 0)

        assert auto.compose('team_damage', {}, 5) is None

    def test_the_global_pause_ends(self):
        auto = messages()
        auto.record('arty_hit', 0)

        assert auto.compose('team_damage', {}, 10) is not None

    def test_no_more_than_four_lines_a_minute(self):
        auto = messages(min_interval_s=3, fire=True)
        for moment in (0, 10, 20, 30):
            auto.record('spotted', moment)

        assert auto.compose('fire', {}, 40) is None

    def test_the_minute_window_slides(self):
        auto = messages(min_interval_s=3, fire=True)
        for moment in (0, 10, 20, 30):
            auto.record('spotted', moment)

        assert auto.compose('fire', {}, 61) is not None

    def test_a_ban_mutes_every_trigger(self):
        auto = messages()
        auto.mute()

        assert auto.compose('arty_hit', {}, 0) is None


class DefaultsTest(unittest.TestCase):

    def test_kurzdors_three_triggers_are_on(self):
        on = [trigger for trigger in TRIGGERS if SCHEMA.defaults[trigger]]

        assert on == list(DEFAULT_ON)

    def test_every_trigger_has_a_cooldown(self):
        assert sorted(COOLDOWNS) == sorted(TRIGGERS)

    def test_every_trigger_has_built_in_lines_in_both_languages(self):
        for language in ('ru', 'en'):
            for trigger in TRIGGERS:
                assert variants(STRINGS[language].get('auto_messages_default_' + trigger)), (language, trigger)

    def test_built_in_lines_fit_the_chat(self):
        for language in ('ru', 'en'):
            for trigger in TRIGGERS:
                for line in variants(STRINGS[language]['auto_messages_default_' + trigger]):
                    assert len(line) <= MAX_LINE_CHARS, line

    def test_built_in_lines_carry_no_emoji(self):
        for language in ('ru', 'en'):
            for trigger in TRIGGERS:
                text = STRINGS[language]['auto_messages_default_' + trigger]
                assert all(ord(char) < EMOJI_START for char in text), (language, trigger)

    def test_both_languages_use_the_same_placeholders(self):
        for trigger in TRIGGERS:
            key = 'auto_messages_default_' + trigger
            ru = set(PLACEHOLDER.findall(STRINGS['ru'][key]))
            en = set(PLACEHOLDER.findall(STRINGS['en'][key]))
            assert ru == en, trigger

    def test_both_languages_have_the_same_keys(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_every_setting_has_a_label(self):
        for key in SCHEMA.defaults:
            assert 'auto_messages_' + key in STRINGS['ru'], key


class ShotTest(unittest.TestCase):

    def test_fewer_shells_in_the_clip_is_a_shot(self):
        assert is_shot((30, 4), (30, 3)) is True

    def test_fewer_shells_in_total_is_a_shot(self):
        assert is_shot((30, 1), (29, 1)) is True

    def test_the_first_count_of_the_battle_is_no_shot(self):
        assert is_shot(None, (30, 4)) is False

    def test_a_refilled_clip_is_no_shot(self):
        assert is_shot((30, 0), (30, 4)) is False


if __name__ == '__main__':
    unittest.main()
