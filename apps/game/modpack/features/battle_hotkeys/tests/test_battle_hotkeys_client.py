from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer
from _support import MemoryFile
from otmetki.features.battle_hotkeys.i18n import STRINGS

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.battle_hotkeys.client')
STUBBED = ('BigWorld', 'Keys', 'gui', 'helpers', 'skeletons', 'skeletons.account_helpers',
           'skeletons.account_helpers.settings_core')
KEYS = {'KEY_J': 36, 'KEY_K': 37, 'KEY_N': 49, 'KEY_M': 50, 'KEY_LCONTROL': 29, 'KEY_LSHIFT': 42}
ALIAS = 'otmetki.hud.battle_hotkeys'


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self

    def __call__(self, *args):
        for handler in list(self.handlers):
            handler(*args)


class Namespace(object):

    def __init__(self, **attrs):
        self.__dict__.update(attrs)


class SettingsCore(object):

    def __init__(self, values):
        self.values = dict(values)
        self.staged = {}
        self.writes = []

    def getSetting(self, name):
        return self.values.get(name)

    def applySettings(self, diff):
        self.staged = dict(diff)

    def applyStorages(self, restart_approved):
        return []

    def confirmChanges(self, confirmators):
        self.writes.append(dict(self.staged))
        self.values.update(self.staged)

    def clearStorages(self):
        self.staged = {}


class Backend(HudBackend):

    def __init__(self):
        self.panels = {}

    def available(self):
        return True

    def create(self, alias, props):
        self.panels[alias] = dict(props)
        return True

    def update(self, alias, props):
        self.panels[alias].update(props)
        return True

    def delete(self, alias):
        self.panels.pop(alias, None)
        return True


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
        self.in_battle = True


class BattleHotkeysClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        self.purge()
        self.callbacks = []
        self.key_down = Event()
        self.core = SettingsCore({'useServerAim': False, 'increasedZoom': True})
        for name in STUBBED:
            sys.modules[name] = types.ModuleType(str(name))
        big_world = sys.modules['BigWorld']
        big_world.player = lambda: Namespace(arena=Namespace())
        big_world.callback = lambda delay, fn: self.callbacks.append(fn)
        big_world.time = lambda: 100.0
        big_world.isKeyDown = lambda key: True
        sys.modules['Keys'].__dict__.update(KEYS)
        sys.modules['gui'].InputHandler = Namespace(g_instance=Namespace(onKeyDown=self.key_down))
        interface = type(str('ISettingsCore'), (object,), {})
        sys.modules['skeletons.account_helpers.settings_core'].ISettingsCore = interface
        core = self.core
        sys.modules['helpers'].dependency = Namespace(instance=lambda wanted: core if wanted is interface else None)
        self.backend = Backend()
        hud = importlib.import_module('otmetki.core.client.hud')
        config = ComponentConfig(MemoryFile())
        hud._state.update({'config': config, 'layer': HudLayer(self.backend, config), 'stock': None})
        module = importlib.import_module('otmetki.features.battle_hotkeys.client')
        self.app = App()
        self.component = module.BattleHotkeys(self.app)

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

    def press(self, key):
        self.key_down(Namespace(key=KEYS[key], isRepeatedEvent=lambda: False))

    def start(self):
        self.app.bus.emit('battle_ready', Namespace(arena=Namespace()))

    def expire_notice(self):
        callbacks = self.callbacks
        self.callbacks = []
        for callback in callbacks:
            callback()

    def test_the_server_aim_key_turns_the_server_reticle_on(self):
        self.start()

        self.press('KEY_J')

        assert self.core.values['useServerAim'] is True

    def test_the_zoom_key_turns_the_extended_zoom_off(self):
        self.start()

        self.press('KEY_K')

        assert self.core.values['increasedZoom'] is False

    def test_a_second_press_turns_it_back(self):
        self.start()

        self.press('KEY_J')
        self.press('KEY_J')

        assert self.core.values['useServerAim'] is False

    def test_a_press_shows_the_notice(self):
        self.start()

        self.press('KEY_J')

        assert u'Server reticle' in self.backend.panels[ALIAS]['text']

    def test_the_notice_goes_after_its_time(self):
        self.start()
        self.press('KEY_J')

        self.expire_notice()

        assert ALIAS not in self.backend.panels

    def test_only_the_pressed_option_is_written(self):
        self.start()

        self.press('KEY_J')

        assert self.core.writes == [{'useServerAim': True}]

    def test_the_keys_do_nothing_outside_a_battle(self):
        self.press('KEY_J')

        assert self.core.writes == []

    def test_the_keys_do_nothing_after_the_battle(self):
        self.start()
        self.app.bus.emit('battle_leave')

        self.press('KEY_J')

        assert self.core.writes == []

    def test_switched_off_the_keys_do_nothing(self):
        self.app.config.on = False
        self.start()

        self.press('KEY_J')

        assert self.core.writes == []


if __name__ == '__main__':
    unittest.main()
