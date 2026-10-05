from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EVENT_COMPONENT_SETTINGS, EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.storage import MemoryFile
from otmetki.features.crosshair.settings import PANEL_ID

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.crosshair.client')
WRITERS = ('otmetki.core.client.native.component', 'otmetki.features.crosshair.client')


class Config(object):

    def is_enabled(self, switch):
        return True


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator({'ru': {}, 'en': {}})
        self.config = Config()
        self.in_battle = False
        self.state = {}
        self.config_dir = '.'

    def register_state(self, key, dump):
        pass

    def save_state(self):
        pass


def forget_client():
    for name in [name for name in sys.modules if name.startswith(CLIENT_PREFIXES)]:
        del sys.modules[name]


class CrosshairNativeTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        forget_client()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        hud = importlib.import_module('otmetki.core.client.hud')
        self.saved_config = hud._state['config']
        self.config = ComponentConfig(MemoryFile())
        hud._state['config'] = self.config
        self.hud = hud
        module = importlib.import_module('otmetki.features.crosshair.client')
        self.writes = []
        for name in WRITERS:
            writer = importlib.import_module(name)
            if hasattr(writer, 'apply_changed'):
                writer.apply_changed = lambda values: self.writes.append(dict(values)) or True
        self.app = App()
        self.component = module.CrosshairComponent(self.app)
        self.config.update(PANEL_ID, {'preset': 'minimal'})
        self.app.bus.emit('hangar')
        del self.writes[:]

    def tearDown(self):
        self.hud._state['config'] = self.saved_config
        forget_client()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def change(self, **values):
        changed = self.config.update(PANEL_ID, values)
        self.app.bus.emit(EVENT_COMPONENT_SETTINGS, PANEL_ID, changed)

    def test_a_change_in_the_hangar_writes_only_the_client_setting_it_moves(self):
        self.change(server_reticle='on')

        assert self.writes == [{'useServerAim': True}]

    def test_a_change_in_battle_is_written_on_the_next_hangar(self):
        self.app.in_battle = True
        self.change(server_reticle='on')
        self.app.in_battle = False

        self.app.bus.emit('hangar')

        assert self.writes == [{'useServerAim': True}]


if __name__ == '__main__':
    unittest.main()
