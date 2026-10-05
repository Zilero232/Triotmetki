from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EVENT_COMPONENT_SETTINGS, EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.native_settings import changed_values
from otmetki.core.settings import Schema
from otmetki.core.storage import MemoryFile

CLIENT_PREFIX = 'otmetki.core.client'
SCHEMA = Schema({'rows': 'two', 'zoom': 'x4', 'quick_actions': False})
TABLES = {'rows': ('carouselType', {'one': 1, 'two': 2}), 'zoom': ('sniperZoom', {'x4': 4, 'x8': 8})}


def to_native(values):
    return dict((name, table[values[key]]) for key, (name, table) in TABLES.items() if values.get(key) in table)


def load_native_component():
    saved = sys.modules.get('BigWorld')
    sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
    try:
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state['config'] = ComponentConfig(MemoryFile())
        return importlib.import_module('otmetki.core.client.native.component'), hud._state['config']
    finally:
        if saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = saved
        for name in [name for name in sys.modules if name.startswith(CLIENT_PREFIX)]:
            del sys.modules[name]


class Config(object):

    def is_enabled(self, switch):
        return True


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator({'ru': {}, 'en': {}})
        self.config = Config()
        self.in_battle = False


class ChangedValuesTest(unittest.TestCase):

    def test_only_the_values_that_moved_are_written(self):
        assert changed_values({'a': 1, 'b': 2}, {'a': 1, 'b': 3}) == {'b': 3}

    def test_a_new_value_is_written(self):
        assert changed_values({}, {'a': 1}) == {'a': 1}

    def test_a_value_back_to_native_writes_nothing(self):
        assert changed_values({'a': 1}, {}) == {}


class NativeComponentTest(unittest.TestCase):

    def setUp(self):
        module, self.config = load_native_component()
        self.writes = []
        module.apply_changed = lambda values: self.writes.append(dict(values)) or True
        self.app = App()
        self.component = module.NativeSettingsComponent(self.app, 'tweaks', SCHEMA, 'tweaks', {}, to_native)
        self.app.bus.emit('hangar')

    def change(self, **values):
        changed = self.config.update('tweaks', values)
        self.app.bus.emit(EVENT_COMPONENT_SETTINGS, 'tweaks', changed)

    def test_a_change_in_the_hangar_writes_its_own_client_setting(self):
        self.change(rows='one')

        assert self.writes == [{'carouselType': 1}]

    def test_an_unrelated_key_rewrites_no_client_setting(self):
        self.change(quick_actions=True)

        assert self.writes in ([], [{}])

    def test_a_change_in_battle_is_written_on_the_next_hangar(self):
        self.app.in_battle = True
        self.change(zoom='x8')
        assert self.writes == []

        self.app.in_battle = False
        self.app.bus.emit('hangar')

        assert self.writes == [{'sniperZoom': 8}]

    def test_a_pending_change_is_written_once(self):
        self.app.in_battle = True
        self.change(zoom='x8')
        self.app.in_battle = False
        self.app.bus.emit('hangar')

        self.app.bus.emit('hangar')

        assert self.writes == [{'sniperZoom': 8}]


if __name__ == '__main__':
    unittest.main()
