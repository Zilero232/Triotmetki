# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.native_settings import ONCE_STATE_KEY
from _support import MemoryFile
from otmetki.features.minimap.model.constants import ONCE, VEHICLE_NAMES, VEHICLE_NAMES_NEVER

CLIENT_PREFIX = 'otmetki.core.client'
FEATURE_CLIENT = 'otmetki.features.minimap.client'
VEHICLE_MODELS_ALT = 1
VEHICLE_MODELS_ALWAYS = 2


class Config(object):

    def __init__(self, user_set=''):
        self.user_set = user_set

    def is_enabled(self, switch):
        return True

    def get(self, key):
        return self.user_set if key == 'user_set' else None


class App(object):

    def __init__(self, state=None, user_set=''):
        self.bus = EventBus()
        self.translate = _support.translator({'ru': {}, 'en': {}})
        self.config = Config(user_set)
        self.in_battle = False
        self.state = dict(state or {})
        self.parts = []
        self.saved = []

    def register_state(self, key, dump):
        self.parts.append((key, dump))

    def save_state(self):
        for key, dump in self.parts:
            self.state[key] = dump()
        self.saved.append(dict(self.state))


class Client(object):

    def __init__(self, game_value):
        self.values = {VEHICLE_NAMES: game_value}
        self.writes = []

    def read(self, names):
        return {name: self.values[name] for name in names if name in self.values}

    def apply(self, values):
        self.writes.append(dict(values))
        self.values.update(values)
        return True


def load(client, components):
    saved = sys.modules.get('BigWorld')
    sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
    try:
        hud = importlib.import_module('otmetki.core.client.hud')
        config = ComponentConfig(MemoryFile(components))
        hud._state['config'] = config
        defaults = importlib.import_module('otmetki.core.client.native.defaults')
        defaults.read_settings = client.read
        defaults.apply_settings = client.apply
        component = importlib.import_module('otmetki.core.client.native.component')
        component.apply_changed = client.apply
        return importlib.import_module(FEATURE_CLIENT).create_minimap, config
    finally:
        if saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = saved
        _support.forget_modules(CLIENT_PREFIX)
        _support.forget_modules(FEATURE_CLIENT)


class OnceTest(unittest.TestCase):

    def start(self, game_value, components=None, state=None, user_set=''):
        self.client = Client(game_value)
        create, self.config = load(self.client, components or {})
        self.app = App(state, user_set)
        self.component = create(self.app)
        return self.component

    def hangar(self):
        self.app.bus.emit('hangar')

    def test_a_fresh_install_with_the_game_at_never_switches_to_always(self):
        self.start(VEHICLE_NAMES_NEVER)

        self.hangar()

        assert self.client.values[VEHICLE_NAMES] == VEHICLE_MODELS_ALWAYS

    def test_a_fresh_section_starts_at_the_once_value(self):
        self.start(VEHICLE_NAMES_NEVER)

        assert self.component.settings.get(ONCE['key']) == ONCE['value']

    def test_the_switch_writes_only_the_extended_features(self):
        self.start(VEHICLE_NAMES_NEVER)

        self.hangar()

        assert self.client.writes == [{VEHICLE_NAMES: VEHICLE_MODELS_ALWAYS}]

    def test_an_install_moved_to_always_by_the_migration_switches_once(self):
        self.start(VEHICLE_NAMES_NEVER, components={'minimap': {'vehicle_names': 'always'}})

        self.hangar()

        assert self.client.values[VEHICLE_NAMES] == VEHICLE_MODELS_ALWAYS

    def test_the_switch_is_recorded_in_the_state(self):
        self.start(VEHICLE_NAMES_NEVER)

        self.hangar()

        assert self.app.state[ONCE_STATE_KEY] == ['minimap']

    def test_a_later_hangar_writes_nothing_again(self):
        self.start(VEHICLE_NAMES_NEVER)
        self.hangar()
        self.client.values[VEHICLE_NAMES] = VEHICLE_NAMES_NEVER

        self.hangar()

        assert self.client.writes == [{VEHICLE_NAMES: VEHICLE_MODELS_ALWAYS}]

    def test_a_restart_after_the_switch_writes_nothing(self):
        self.start(VEHICLE_NAMES_NEVER, state={ONCE_STATE_KEY: ['minimap']})

        self.hangar()

        assert self.client.writes == []

    def test_a_value_the_player_chose_in_the_window_stays_at_never(self):
        components = {'minimap': {'vehicle_names': 'native'}}
        self.start(VEHICLE_NAMES_NEVER, components=components, user_set='minimap.vehicle_names')

        self.hangar()

        assert self.client.values[VEHICLE_NAMES] == VEHICLE_NAMES_NEVER

    def test_a_section_left_to_the_game_is_not_switched(self):
        self.start(VEHICLE_NAMES_NEVER, components={'minimap': {'vehicle_names': 'native'}})

        self.hangar()

        assert self.client.writes == []

    def test_a_game_at_alt_is_kept(self):
        self.start(VEHICLE_MODELS_ALT)

        self.hangar()

        assert self.client.writes == []

    def test_a_game_at_alt_puts_the_section_back_to_the_game(self):
        self.start(VEHICLE_MODELS_ALT)

        self.hangar()

        assert self.component.settings.get(ONCE['key']) == 'native'

    def test_nothing_is_switched_in_battle(self):
        self.start(VEHICLE_NAMES_NEVER)
        self.app.in_battle = True

        self.hangar()

        assert self.client.writes == []


if __name__ == '__main__':
    unittest.main()
