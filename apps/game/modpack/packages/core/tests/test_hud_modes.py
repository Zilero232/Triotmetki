# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer, panel_schema
from otmetki.core.hud.modes import (
    PLACES_SECTION,
    ModePlaces,
    allowed_panels,
    battle_mode,
    clean_place,
    clean_places,
)
from _support import MemoryFile

GUI_TYPE_MODES = (
    ((1, 1), 'random'),
    ((30, 43), 'comp7'),
    ((33, 47), 'comp7'),
    ((21, 27), 'frontline'),
    ((23, 29), 'battle_royale'),
    ((301, 52), 'event'),
    ((100,), 'event'),
)
FALLBACK_MODES = (
    ((None, 43), 'comp7'),
    ((None, 52), 'event'),
    ((None, None, 'epicBattlePage'), 'frontline'),
    ((999,), 'event'),
    ((99,), 'random'),
    ((None, None, None), 'random'),
    ((True, None), 'random'),
)


class Backend(HudBackend):

    def __init__(self):
        self.labels = {}
        self.on_moved = None

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

    def listen(self, on_moved):
        self.on_moved = on_moved


def layer_with(*panel_ids):
    layer = HudLayer(Backend(), ComponentConfig(MemoryFile()))
    for panel_id in panel_ids:
        layer.register(panel_id, panel_schema({'x': 10, 'y': 20}))
    return layer


def compact_policy(mode):
    if mode == 'event':
        return allowed_panels('compact'), True
    return None, True


def compact_event_layer():
    layer = layer_with('damage_log', 'team_hp')
    layer.set_policy(compact_policy)
    layer.show('team_hp', 'a')
    layer.enter_mode('event')
    return layer


def event_layer_with_a_dragged_log():
    layer = layer_with('damage_log')
    layer.set_policy(compact_policy)
    layer.enter_mode('event')
    layer.show('damage_log', 'log')
    layer.on_moved('otmetki.hud.damage_log', {'x': 300, 'y': 40})
    return layer


def rough_place():
    return {'x': 5.6, 'y': 99999, 'align_x': 'left', 'align_y': 'middle', 'scale': 10, 'alpha': 3}


def hand_edited_places():
    return {'comp7': {'damage_log': {'x': 'far', 'y': 3}}, 'bad': {}, 'event': []}


def places_with_a_comp7_log():
    config = ComponentConfig(MemoryFile())
    places = ModePlaces(config)
    places.save('comp7', 'damage_log', {'x': 1, 'y': 2})
    return config, places


class BattleModeTest(unittest.TestCase):

    def test_gui_type_decides_first(self):
        for arguments, mode in GUI_TYPE_MODES:
            assert battle_mode(*arguments) == mode, arguments

    def test_bonus_type_then_page_then_random(self):
        for arguments, mode in FALLBACK_MODES:
            assert battle_mode(*arguments) == mode, arguments


class AllowedPanelsTest(unittest.TestCase):

    def test_full_layout_allows_every_panel(self):
        assert allowed_panels('full') is None

    def test_compact_layout_allows_the_compact_panels(self):
        assert allowed_panels('compact') == frozenset(('marks_panel', 'damage_log'))

    def test_off_layout_allows_nothing(self):
        assert allowed_panels('off') == frozenset()


class CleanPlaceTest(unittest.TestCase):

    def test_rounds_clamps_and_drops_unknown_values(self):
        place = clean_place(rough_place())

        assert place == {'x': 6, 'y': 4000, 'align_x': 'left', 'scale': 50}

    def test_no_place_is_empty(self):
        assert clean_place(None) == {}

    def test_a_boolean_coordinate_is_dropped(self):
        assert clean_place({'x': True}) == {}

    def test_an_infinite_coordinate_is_dropped(self):
        assert clean_place({'x': float('inf')}) == {}

    def test_a_nan_coordinate_is_dropped(self):
        assert clean_place({'x': float('nan')}) == {}


class CleanPlacesTest(unittest.TestCase):

    def test_only_known_battle_types_are_kept(self):
        assert clean_places({'comp7': {}, 'nowhere': {}}) == {'comp7': {}}

    def test_a_battle_type_that_is_not_an_object_is_dropped(self):
        assert clean_places({'comp7': 'x'}) == {}

    def test_each_place_is_cleaned(self):
        assert clean_places({'comp7': {'damage_log': {'x': 5.4, 'junk': 1}}}) == {'comp7': {'damage_log': {'x': 5}}}

    def test_a_section_that_is_not_an_object_is_empty(self):
        assert clean_places(['comp7']) == {}


class ModePlacesTest(unittest.TestCase):

    def test_save_returns_the_changed_keys(self):
        places = ModePlaces(ComponentConfig(MemoryFile()))

        changed = places.save('comp7', 'damage_log', {'x': 1, 'y': 2})

        assert changed == ['x', 'y']

    def test_saving_the_same_place_changes_nothing(self):
        _, places = places_with_a_comp7_log()

        changed = places.save('comp7', 'damage_log', {'x': 1})

        assert changed == []

    def test_random_places_are_never_saved(self):
        places = ModePlaces(ComponentConfig(MemoryFile()))

        changed = places.save('random', 'damage_log', {'x': 1})

        assert changed == []
        assert places.modes() == []

    def test_unknown_mode_places_are_never_saved(self):
        places = ModePlaces(ComponentConfig(MemoryFile()))

        changed = places.save('nowhere', 'damage_log', {'x': 1})

        assert changed == []
        assert places.modes() == []

    def test_saved_place_reads_back_per_mode(self):
        _, places = places_with_a_comp7_log()

        assert places.get('comp7', 'damage_log') == {'x': 1, 'y': 2}
        assert places.get('event', 'damage_log') == {}
        assert places.modes() == ['comp7']

    def test_saved_places_live_in_their_config_section(self):
        config, places = places_with_a_comp7_log()

        section = config.store.read({})[PLACES_SECTION]

        assert section == {'comp7': {'damage_log': {'x': 1, 'y': 2}}}

    def test_clear_forgets_every_mode(self):
        _, places = places_with_a_comp7_log()

        cleared = places.clear()

        assert cleared
        assert places.modes() == []

    def test_clearing_nothing_reports_no_change(self):
        places = ModePlaces(ComponentConfig(MemoryFile()))

        assert not places.clear()

    def test_hand_edited_section_is_cleaned(self):
        config = ComponentConfig(MemoryFile())
        config.set_raw(PLACES_SECTION, hand_edited_places())

        places = ModePlaces(config)

        assert places.get('comp7', 'damage_log') == {'y': 3}
        assert places.modes() == ['comp7']


class LayerModeTest(unittest.TestCase):

    def test_without_a_policy_every_panel_shows(self):
        layer = layer_with('damage_log', 'team_hp')
        layer.enter_mode('event')

        shown = layer.show('team_hp', 'a')

        assert shown
        assert 'otmetki.hud.team_hp' in layer.backend.labels

    def test_compact_event_layout_holds_other_panels(self):
        layer = compact_event_layer()

        assert not layer.allows('team_hp')
        assert layer.allows('damage_log')
        assert 'otmetki.hud.team_hp' not in layer.backend.labels

    def test_leaving_the_compact_layout_brings_held_panels_back(self):
        layer = compact_event_layer()

        layer.leave_mode()

        assert layer.backend.labels['otmetki.hud.team_hp']['text'] == 'a'

    def test_a_drag_in_a_battle_type_is_kept_for_that_type(self):
        layer = layer_with('damage_log')
        layer.set_policy(compact_policy)
        layer.enter_mode('event')
        layer.show('damage_log', 'log')

        moved = layer.on_moved('otmetki.hud.damage_log', {'x': 300, 'y': 40})

        assert moved
        assert layer.panels['damage_log'].get('x') == 10
        assert layer.mode_places.get('event', 'damage_log') == {'x': 300, 'y': 40}

    def test_leaving_the_battle_type_restores_the_own_place(self):
        layer = event_layer_with_a_dragged_log()

        layer.leave_mode()

        assert layer.backend.labels['otmetki.hud.damage_log']['x'] == 10

    def test_entering_the_battle_type_again_restores_its_place(self):
        layer = event_layer_with_a_dragged_log()
        layer.leave_mode()

        layer.enter_mode('event')

        assert layer.backend.labels['otmetki.hud.damage_log']['x'] == 300

    def test_random_keeps_the_panels_own_places(self):
        layer = layer_with('damage_log')
        layer.set_policy(compact_policy)
        layer.enter_mode('random')
        layer.show('damage_log', 'log')

        layer.on_moved('otmetki.hud.damage_log', {'x': 50, 'y': 60})

        assert layer.panels['damage_log'].get('x') == 50
        assert layer.mode_places.modes() == []

    def test_a_type_without_own_places_saves_into_the_settings(self):
        layer = layer_with('damage_log')
        layer.set_policy(lambda mode: (None, False))
        layer.enter_mode('comp7')
        layer.show('damage_log', 'log')

        layer.on_moved('otmetki.hud.damage_log', {'x': 70})

        assert layer.panels['damage_log'].get('x') == 70


if __name__ == '__main__':
    unittest.main()
