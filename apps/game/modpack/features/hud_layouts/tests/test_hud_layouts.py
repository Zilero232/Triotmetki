# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer, panel_schema
from otmetki.core.hud.modes import COMPACT_PANELS, MODES
from otmetki.core.settings import Settings
from _support import MemoryFile
from otmetki.features.hud_layouts.i18n import STRINGS
from otmetki.features.hud_layouts.model import layout_policy, place_actions
from otmetki.features.hud_layouts.settings import SCHEMA, SETTINGS


class Backend(HudBackend):

    def __init__(self):
        self.labels = {}

    def available(self):
        return True

    def create(self, alias, props):
        self.labels[alias] = dict(props)
        return True

    def update(self, alias, props):
        self.labels[alias].update(props)
        return True

    def delete(self, alias):
        del self.labels[alias]
        return True


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def default_policy():
    return layout_policy(Settings({}, SCHEMA), lambda: True)


def layer_in_compact_comp7():
    layer = HudLayer(Backend(), ComponentConfig(MemoryFile()))
    for panel_id in ('damage_log', 'team_hp'):
        layer.register(panel_id, panel_schema({}))
    settings = Settings({'comp7': 'compact', 'own_places': False}, SCHEMA)
    layer.set_policy(layout_policy(settings, lambda: True))
    layer.enter_mode('comp7')
    return layer


def reset_action():
    return place_actions(['comp7', 'event'], translator())[0]


class PolicyTest(unittest.TestCase):

    def test_random_battles_show_every_panel(self):
        assert default_policy()('random') == (None, True)

    def test_onslaught_shows_every_panel(self):
        assert default_policy()('comp7') == (None, True)

    def test_events_show_the_essentials(self):
        assert default_policy()('event') == (frozenset(COMPACT_PANELS), True)

    def test_frontline_shows_the_essentials(self):
        assert default_policy()('frontline') == (frozenset(COMPACT_PANELS), True)

    def test_steel_hunter_shows_no_panels(self):
        assert default_policy()('battle_royale') == (frozenset(), True)

    def test_an_unknown_battle_type_shows_every_panel_at_its_own_place(self):
        assert default_policy()('unknown') == (None, False)

    def test_switched_off_shows_every_panel_at_its_own_place(self):
        policy = layout_policy(Settings({'event': 'off'}, SCHEMA), lambda: False)

        assert policy('event') == (None, False)


class LayerTest(unittest.TestCase):

    def test_the_layer_allows_an_essential_panel(self):
        assert layer_in_compact_comp7().allows('damage_log')

    def test_the_layer_hides_a_panel_outside_the_layout(self):
        assert not layer_in_compact_comp7().allows('team_hp')

    def test_the_layer_keeps_the_shared_places_when_asked(self):
        assert not layer_in_compact_comp7().own_places


class ResetPlacesTest(unittest.TestCase):

    def test_no_per_type_places_offer_no_button(self):
        assert place_actions([], translator()) == []

    def test_the_button_is_the_reset_action(self):
        assert reset_action()['id'] == 'reset_places'

    def test_the_confirmation_names_the_battle_types(self):
        assert u'Натиск, События' in reset_action()['confirm']


class SettingsTest(unittest.TestCase):

    def test_the_component_switch_is_battle_hud_layouts(self):
        assert SETTINGS == ('battle_hud_layouts',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_every_battle_type_has_a_label(self):
        for mode in MODES:
            assert 'hud_layouts_' + mode in STRINGS['ru']

    def test_every_layout_of_every_battle_type_has_a_label(self):
        for mode in MODES:
            for layout in SCHEMA.choices[mode]:
                assert 'hud_layouts_%s_%s' % (mode, layout) in STRINGS['en']


if __name__ == '__main__':
    unittest.main()
