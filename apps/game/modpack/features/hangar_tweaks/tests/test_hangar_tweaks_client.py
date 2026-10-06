from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EVENT_COMPONENT_SETTINGS, EventBus
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.hangar_tweaks.i18n import STRINGS
from otmetki.features.hangar_tweaks.settings import SWITCH

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.hangar_tweaks.client')
STUBBED = ('BigWorld',)
GAME_SCALE = 1.0


class Config(object):

    def __init__(self):
        self.on = True

    def is_enabled(self, switch):
        return self.on


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS, 'en')
        self.config = Config()
        self.in_battle = False
        self.account_id = None


class HangarTweaksClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        self.purge()
        for name in STUBBED:
            sys.modules[name] = types.ModuleType(str(name))
        hud = importlib.import_module('otmetki.core.client.hud')
        self.config = ComponentConfig(MemoryFile())
        hud._state.update({'config': self.config})
        module = importlib.import_module('otmetki.features.hangar_tweaks.client')
        self.scale = [GAME_SCALE]
        module.current_scale = lambda: self.scale[-1]
        module.apply_scale = self.scale.append
        module.restore_scale = lambda: self.scale.append(GAME_SCALE)
        importlib.import_module('otmetki.core.client.native.component').apply_changed = lambda values: True
        self.app = App()
        self.component = module.HangarTweaks(self.app)

    def tearDown(self):
        for name, saved in self.saved.items():
            if saved is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = saved
        self.purge()

    @staticmethod
    def purge():
        _support.forget_modules(CLIENT_PREFIXES)

    def set_exact(self, percent):
        changed = self.config.update('hangar_tweaks', {'interface_scale_exact': percent})
        self.app.bus.emit(EVENT_COMPONENT_SETTINGS, 'hangar_tweaks', changed)

    def test_the_exact_scale_is_applied_in_the_hangar(self):
        self.set_exact(130)

        assert self.scale[-1] == 1.3

    def test_turning_the_exact_scale_off_brings_the_game_scale_back(self):
        self.set_exact(130)

        self.set_exact(0)

        assert self.scale[-1] == GAME_SCALE

    def test_switching_the_component_off_brings_the_game_scale_back(self):
        self.set_exact(130)

        self.app.config.on = False
        self.app.bus.emit(EVENT_COMPONENT_SETTINGS, 'hangar_tweaks', [SWITCH])

        assert self.scale[-1] == GAME_SCALE

    def test_in_battle_the_scale_is_left_alone(self):
        self.set_exact(130)
        self.app.in_battle = True

        self.app.config.on = False
        self.app.bus.emit(EVENT_COMPONENT_SETTINGS, 'hangar_tweaks', [SWITCH])

        assert self.scale[-1] == 1.3


if __name__ == '__main__':
    unittest.main()
