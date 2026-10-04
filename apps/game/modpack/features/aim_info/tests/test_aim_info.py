# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.format import COLOR_DOWN, COLOR_MUTED, COLOR_UP, COLOR_WARN
from otmetki.core.i18n import Catalog, Translator
from otmetki.core.settings import Settings
from otmetki.features.aim_info.i18n import STRINGS
from otmetki.features.aim_info.model import has_body, scaled_size, shell_lines, shell_stats, with_lines
from otmetki.features.aim_info.model.armor import (
    TickGate,
    armor_readout,
    format_armor,
    public_team,
    reticle_place,
    server_tick,
    verdict_tone,
    view_offset,
)
from otmetki.features.aim_info.model.constants import PLACEMENTS, PREVIEW_READOUT
from otmetki.features.aim_info.model.preview import preview_text, preview_widget
from otmetki.features.aim_info.model.widget import armor_widget
from otmetki.features.aim_info.settings import DEFAULTS, SCHEMA, SETTINGS, SWITCH

STOCK_WITH_BODY = '{HEADER}AP 105 mm{/HEADER}\n/{BODY}Damage: 320\nPenetration: 212 mm{/BODY}'
STOCK_HEADER_ONLY = '{HEADER}AP 105 mm{/HEADER}'
# A spaced-armour screen (no vehicle damage) in front of the hull's front plate, met at 30 degrees.
SCREEN = {'armor': 20.0, 'effective': 23.1, 'damaging': False, 'ricochet': False, 'angle_cos': 0.866}
HULL = {'armor': 180.0, 'effective': 207.8, 'damaging': True, 'ricochet': False, 'angle_cos': 0.866}
TRACK = {'armor': 40.0, 'effective': 40.0, 'damaging': False, 'ricochet': False, 'angle_cos': 1.0}
BOUNCE = {'armor': 60.0, 'effective': 300.0, 'damaging': True, 'ricochet': True, 'angle_cos': 0.2}


def translate(language='en'):
    return Translator(Catalog(STRINGS), language)


def settings(values=None):
    return Settings(values or {}, SCHEMA)


def stats():
    return shell_stats((320.0, 175.0), 212.4, 1030.0, 0.8)


def readout(layers=(SCREEN, HULL), piercing=218.4, verdict='little_pierced'):
    return armor_readout(list(layers), piercing, verdict)


class ShellStatsTest(unittest.TestCase):

    def test_the_armour_damage_is_the_damage(self):
        assert stats()['damage'] == 320.0

    def test_the_devices_damage_is_the_module_damage(self):
        assert stats()['module_damage'] == 175.0

    def test_the_speed_is_in_metres_per_second(self):
        assert stats()['speed'] == 1030.0 / 0.8

    def test_a_missing_speed_factor_leaves_the_speed_out(self):
        assert shell_stats((320.0, 175.0), 212.4, 1030.0, None)['speed'] is None

    def test_a_damage_of_another_shape_leaves_both_damages_out(self):
        numbers = shell_stats(320.0, 212.4, 1030.0, 0.8)

        assert (numbers['damage'], numbers['module_damage']) == (None, None)


class ShellLinesTest(unittest.TestCase):

    def test_a_stock_body_gets_only_the_module_damage(self):
        assert shell_lines(stats(), translate(), full=False) == ['Module damage: 175']

    def test_a_tooltip_without_a_body_gets_every_number(self):
        lines = shell_lines(stats(), translate(), full=True)

        assert lines == ['Damage: 320', 'Penetration: 212 mm', 'Speed: 1 288 m/s', 'Module damage: 175']

    def test_a_number_the_client_did_not_give_is_left_out(self):
        numbers = shell_stats((320.0, 175.0), None, None, 0.8)

        assert shell_lines(numbers, translate(), full=True) == ['Damage: 320', 'Module damage: 175']


class WithLinesTest(unittest.TestCase):

    def test_lines_go_at_the_end_of_the_stock_body(self):
        tooltip = with_lines(STOCK_WITH_BODY, ['Module damage: 175'])

        assert tooltip.endswith('Penetration: 212 mm\nModule damage: 175{/BODY}')

    def test_a_tooltip_without_a_body_gets_one(self):
        tooltip = with_lines(STOCK_HEADER_ONLY, ['Damage: 320'])

        assert tooltip == STOCK_HEADER_ONLY + '\n/{BODY}Damage: 320{/BODY}'

    def test_no_lines_leave_the_tooltip_as_it_was(self):
        assert with_lines(STOCK_WITH_BODY, []) == STOCK_WITH_BODY

    def test_the_stock_body_is_found(self):
        assert has_body(STOCK_WITH_BODY)

    def test_a_header_only_tooltip_has_no_body(self):
        assert not has_body(STOCK_HEADER_ONLY)


class AimCircleTest(unittest.TestCase):

    def test_the_circle_is_drawn_at_the_chosen_share(self):
        assert scaled_size(80.0, 70) == 56.0

    def test_a_size_that_is_not_a_number_stays(self):
        assert scaled_size(None, 70) is None


class ArmorReadoutTest(unittest.TestCase):

    def test_the_effective_armour_adds_the_screens_up_to_the_damaging_plate(self):
        assert readout()['effective'] == 231

    def test_the_nominal_armour_is_the_damaging_plates(self):
        assert readout()['nominal'] == 180

    def test_the_piercing_is_the_own_shells_at_the_distance(self):
        assert readout()['piercing'] == 218

    def test_the_angle_is_the_damaging_plates_hit_angle(self):
        assert readout()['angle'] == 30

    def test_a_ricochet_stops_the_walk(self):
        bounced = readout((SCREEN, BOUNCE, HULL))

        assert (bounced['ricochet'], bounced['nominal'], bounced['effective']) == (True, 60, 23)

    def test_a_ray_through_tracks_only_counts_them(self):
        assert readout((TRACK,))['effective'] == 40

    def test_no_verdict_has_no_readout(self):
        assert readout(verdict='undefined') is None

    def test_no_plates_have_no_readout(self):
        assert readout(()) is None

    def test_a_missing_piercing_is_left_out(self):
        assert readout(piercing=None)['piercing'] is None

    def test_the_tone_follows_the_stock_verdict(self):
        tones = [verdict_tone(readout(verdict=name)) for name in ('great_pierced', 'little_pierced', 'not_pierced')]

        assert tones == ['good', 'warning', 'bad']


class FixedDict(object):

    def __init__(self, values):
        self.values = values

    def __getitem__(self, key):
        return self.values[key]


class PublicTeamTest(unittest.TestCase):

    def test_the_team_is_read_from_a_fixed_dict_without_get(self):
        assert public_team(FixedDict({'team': 2})) == 2

    def test_a_fixed_dict_without_a_team_has_none(self):
        assert public_team(FixedDict({})) is None

    def test_no_public_info_has_no_team(self):
        assert public_team(None) is None


class TickGateTest(unittest.TestCase):

    def test_the_first_resolution_of_a_tick_passes(self):
        assert TickGate().allow(100.0)

    def test_the_next_resolution_of_the_same_tick_is_held(self):
        gate = TickGate()
        gate.allow(100.0)

        assert not gate.allow(100.04)

    def test_the_next_tick_passes(self):
        gate = TickGate()
        gate.allow(100.0)

        assert gate.allow(100.11)

    def test_a_cleared_gate_passes_the_same_tick_again(self):
        gate = TickGate()
        gate.allow(100.0)
        gate.clear()

        assert gate.allow(100.0)

    def test_without_a_clock_everything_passes(self):
        gate = TickGate()
        gate.allow(None)

        assert gate.allow(None)

    def test_the_tick_is_a_tenth_of_a_second(self):
        assert server_tick(100.25) == 1002


class FormatTest(unittest.TestCase):

    def test_the_effective_armour_takes_the_verdicts_colour(self):
        assert COLOR_WARN in format_armor(readout(), settings(), translate())

    def test_a_great_pierce_is_green_and_a_bounce_red(self):
        great = format_armor(readout(verdict='great_pierced'), settings(), translate())
        none = format_armor(readout(verdict='not_pierced'), settings(), translate())

        assert (COLOR_UP in great, COLOR_DOWN in none) == (True, True)

    def test_the_nominal_and_the_piercing_are_muted_after_it(self):
        text = format_armor(readout(), settings(), translate())

        assert u'nom. 180' in text
        assert u'pen. 218' in text
        assert COLOR_MUTED in text

    def test_the_angle_is_off_by_default(self):
        assert u'30°' not in format_armor(readout(), settings(), translate())

    def test_the_angle_can_be_switched_on(self):
        assert u'30°' in format_armor(readout(), settings({'show_angle': True}), translate())

    def test_the_extras_can_be_switched_off(self):
        text = format_armor(readout(), settings({'show_nominal': False, 'show_piercing': False}), translate())

        assert u'nom.' not in text
        assert u'pen.' not in text

    def test_a_ricochet_writes_the_word(self):
        assert u'рикошет' in format_armor(readout((BOUNCE,)), settings(), translate('ru'))

    def test_no_readout_has_no_text(self):
        assert format_armor(None, settings(), translate()) is None


class WidgetTest(unittest.TestCase):

    def test_the_widget_carries_the_numbers_and_the_tone(self):
        data = armor_widget(readout(), settings(), translate())['data']

        assert (data['value'], data['nominal'], data['piercing'], data['tone']) == (u'231', u'180', u'218', 'warning')

    def test_a_ricochet_is_flagged(self):
        data = armor_widget(readout((BOUNCE,)), settings(), translate())['data']

        assert (data['ricochet'], data['value']) == (True, u'ricochet')

    def test_switched_off_extras_are_empty(self):
        data = armor_widget(readout(), settings({'show_nominal': False, 'show_piercing': False}), translate())['data']

        assert (data['nominal'], data['piercing'], data['angle']) == (u'', u'', u'')

    def test_no_readout_has_no_widget(self):
        assert armor_widget(None, settings(), translate()) is None

    def test_the_preview_widget_matches_the_page_fixture(self):
        assert _support.widget_fixture('aim_armor', preview_widget(settings(), translate('ru')))

    def test_the_preview_text_shows_the_sample(self):
        assert u'%d' % PREVIEW_READOUT['effective'] in preview_text(settings(), translate('ru'))


class PlaceTest(unittest.TestCase):

    def test_each_camera_view_has_its_fixed_offset(self):
        values = settings({'arcade_offset': 10, 'sniper_offset': 20, 'strategic_offset': 30})

        assert [view_offset(view, values) for view in (1, 2, 3)] == [132, 132, 100]

    def test_another_view_has_no_offset(self):
        assert view_offset(7, settings()) is None

    def test_the_readout_sits_under_the_reticle_from_the_screen_centre(self):
        assert reticle_place((980, 500), (1920, 1080), 1.0, 132) == (20, 92)

    def test_the_interface_scale_scales_the_centre(self):
        assert reticle_place((980, 500), (2560, 1440), 1.25, 100) == (-44, 24)


class SettingsTest(unittest.TestCase):

    def test_the_distance_is_on(self):
        assert DEFAULTS['target_distance'] is True

    def test_the_shell_tooltips_are_on(self):
        assert DEFAULTS['shell_tooltips'] is True

    def test_the_armour_readout_is_on(self):
        assert DEFAULTS['armor_under_aim'] is False

    def test_the_readout_follows_the_reticle(self):
        assert DEFAULTS['placement'] == 'reticle'
        assert set(PLACEMENTS) == {'reticle', 'fixed'}

    def test_the_aim_circle_is_off_until_the_player_turns_it_on(self):
        assert DEFAULTS['aim_circle'] is False

    def test_the_circle_is_never_drawn_bigger_than_the_client_draws_it(self):
        assert settings({'aim_circle_scale': 150}).get('aim_circle_scale') == 100

    def test_the_switch_is_the_one_setting(self):
        assert SETTINGS == (SWITCH,)

    def test_every_key_has_a_label_in_both_languages(self):
        for language in ('ru', 'en'):
            for key in DEFAULTS:
                if key not in ('x', 'y', 'align_x', 'align_y'):
                    assert 'aim_info_%s' % key in STRINGS[language]

    def test_both_languages_have_the_same_keys(self):
        assert set(STRINGS['ru']) == set(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
