# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re
import unittest

import _support  # noqa: F401
from otmetki.core.native_settings import client_holds, client_keys, native_choices, recommended, setting_names
from otmetki.core.settings import Settings
from otmetki.features.minimap.model import ACCOUNT_FIELDS, FIELDS, to_account, to_native
from otmetki.features.minimap.model.constants import VEHICLE_NAMES
from otmetki.features.minimap.i18n import STRINGS
from otmetki.features.minimap.settings import SCHEMA, SETTINGS

# RU 1.45 account_helpers/settings_core/options.py MinimapVehModelsSetting: VEHICLE_MODELS_TYPES index of 'never', and
# getDefaultValue (the index of 'always').
VEHICLE_MODELS_NEVER = 0
VEHICLE_MODELS_DEFAULT = 2
FORBIDDEN = re.compile(r'enemy|lost|direction|barrel|gun|tracer|arty|destroy|spot|transparen(?!cy$)', re.I)


def chosen_values():
    return Settings({
        'size': '3',
        'transparency': '40',
        'vehicle_names': 'alt',
        'view_range': 'on',
        'max_view_range': 'off',
        'draw_range': 'native',
    }, SCHEMA).to_dict()


class MinimapTest(unittest.TestCase):

    def test_native_values_change_nothing(self):
        assert to_native(native_choices(client_keys(SCHEMA))) == {}

    def test_the_defaults_are_the_recommended_minimap(self):
        assert to_native(Settings(None, SCHEMA).to_dict()) == {
            'showVehModelsOnMap': 2,
            'minimapViewRange': True,
            'minimapMaxViewRange': True,
            'minimapDrawRange': False,
        }

    def test_every_minimap_value_is_a_client_setting(self):
        expected = ('draw_range', 'max_view_range', 'size', 'transparency', 'vehicle_names', 'view_range')

        assert client_keys(SCHEMA) == expected

    def test_defaults_change_no_account_setting(self):
        assert to_account(Settings(None, SCHEMA).to_dict()) == {}

    def test_the_component_switch_is_minimap_tweaks(self):
        assert SETTINGS == ('minimap_tweaks',)

    def test_values_map_to_the_client_settings(self):
        assert to_native(chosen_values()) == {
            'minimapAlpha': 40,
            'minimapAlphaEnabled': True,
            'showVehModelsOnMap': 1,
            'minimapViewRange': True,
            'minimapMaxViewRange': False,
        }

    def test_a_chosen_transparency_turns_on_the_games_transparency_switch(self):
        values = dict(chosen_values(), transparency='20')

        assert to_native(values)['minimapAlphaEnabled'] is True

    def test_no_transparency_turns_the_games_transparency_switch_off(self):
        values = dict(chosen_values(), transparency='0')

        assert to_native(values)['minimapAlphaEnabled'] is False

    def test_the_games_transparency_is_left_alone_with_its_own_value(self):
        values = dict(chosen_values(), transparency='native')

        assert 'minimapAlphaEnabled' not in to_native(values)

    def test_the_size_maps_to_the_account_setting(self):
        assert to_account(chosen_values()) == {'minimapSize': 3}

    def test_the_size_is_an_account_setting(self):
        assert setting_names(ACCOUNT_FIELDS) == ('minimapSize',)

    def test_the_size_is_not_a_settings_core_option(self):
        assert 'minimapSize' not in setting_names(FIELDS)

    def test_an_out_of_range_size_falls_back_to_native(self):
        assert Settings({'size': '9', 'vehicle_names': 'enemies'}, SCHEMA).to_dict()['size'] == 'native'

    def test_the_recommended_extended_features_are_the_games_default(self):
        assert to_native(Settings(None, SCHEMA).to_dict())[VEHICLE_NAMES] == VEHICLE_MODELS_DEFAULT

    def test_the_component_never_switches_the_extended_features_off(self):
        for choice in SCHEMA.choices['vehicle_names']:
            assert to_native(dict(chosen_values(), vehicle_names=choice)).get(VEHICLE_NAMES) != VEHICLE_MODELS_NEVER

    def test_a_stored_never_keeps_the_games_own_value(self):
        values = Settings(dict(chosen_values(), vehicle_names='never'), SCHEMA).to_dict()

        assert values['vehicle_names'] == 'native'
        assert VEHICLE_NAMES not in to_native(values)

    def test_the_extended_features_map_to_the_client_indices(self):
        assert to_native(dict(chosen_values(), vehicle_names='always'))[VEHICLE_NAMES] == 2

    def test_the_extended_features_are_the_stock_setting_name(self):
        assert VEHICLE_NAMES == 'showVehModelsOnMap'

    def test_a_game_at_never_does_not_hold_the_recommended_minimap(self):
        wanted = to_native(recommended(SCHEMA, client_keys(SCHEMA)))
        game = dict(wanted, showVehModelsOnMap=VEHICLE_MODELS_NEVER)

        assert client_holds(game, wanted) is False

    def test_a_game_at_the_recommended_values_holds_them(self):
        wanted = to_native(recommended(SCHEMA, client_keys(SCHEMA)))

        assert client_holds(dict(wanted, minimapAlpha=30), wanted) is True

    def test_the_option_is_named_after_what_it_shows(self):
        assert u'названия' in STRINGS['ru']['minimap_vehicle_names']
        assert 'names' in STRINGS['en']['minimap_vehicle_names']

    def test_only_vanilla_minimap_options_are_written(self):
        expected = ('minimapAlpha', 'minimapDrawRange', 'minimapMaxViewRange', 'minimapViewRange', 'showVehModelsOnMap')

        assert setting_names(FIELDS) == expected

    def test_no_option_touches_enemy_information(self):
        for name in setting_names(FIELDS) + setting_names(ACCOUNT_FIELDS):
            assert not FORBIDDEN.search(name), name


if __name__ == '__main__':
    unittest.main()
