# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.i18n import Catalog, Translator
from otmetki.features.aim_info.i18n import STRINGS
from otmetki.features.aim_info.model import has_body, shell_lines, shell_stats, with_lines
from otmetki.features.aim_info.settings import DEFAULTS, SCHEMA, SETTINGS, SWITCH

STOCK_WITH_BODY = '{HEADER}AP 105 mm{/HEADER}\n/{BODY}Damage: 320\nPenetration: 212 mm{/BODY}'
STOCK_HEADER_ONLY = '{HEADER}AP 105 mm{/HEADER}'


def translate(language='en'):
    return Translator(Catalog(STRINGS), language)


def stats():
    return shell_stats((320.0, 175.0), 212.4, 1030.0, 0.8)


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


class SettingsTest(unittest.TestCase):

    def test_the_distance_is_on(self):
        assert DEFAULTS['target_distance'] is True

    def test_the_shell_tooltips_are_on(self):
        assert DEFAULTS['shell_tooltips'] is True

    def test_the_settings_are_the_distance_and_the_tooltips(self):
        assert set(DEFAULTS) == {'target_distance', 'shell_tooltips'}

    def test_the_component_is_no_hud_panel(self):
        assert set(SCHEMA.defaults) == set(DEFAULTS)

    def test_the_switch_is_the_one_setting(self):
        assert SETTINGS == (SWITCH,)

    def test_every_key_has_a_label_in_both_languages(self):
        for language in ('ru', 'en'):
            for key in DEFAULTS:
                assert 'aim_info_%s' % key in STRINGS[language]

    def test_both_languages_have_the_same_keys(self):
        assert set(STRINGS['ru']) == set(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
