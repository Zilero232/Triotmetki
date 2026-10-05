from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EVENT_SETTINGS_OPEN, EventBus
from otmetki.core.hud import ComponentConfig, HudBackend
from otmetki.core.storage import MemoryFile
from otmetki.features.battle_menu.i18n import STRINGS

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.battle_menu.client')
MENU_MODULE = 'gui.Scaleform.daapi.view.battle.shared.ingame_menu'
STUBBED = (
    'BigWorld', 'gui', 'gui.Scaleform', 'gui.Scaleform.daapi', 'gui.Scaleform.daapi.view',
    'gui.Scaleform.daapi.view.battle', 'gui.Scaleform.daapi.view.battle.shared', MENU_MODULE,
)
ALIAS = 'otmetki.battle_menu.button'


class Backend(HudBackend):

    def __init__(self, buttons=True):
        self.panels = {}
        self.buttons = buttons
        self.pressed = []

    def available(self):
        return True

    def draws_buttons(self):
        return self.buttons

    def create(self, alias, props):
        self.panels[alias] = dict(props)
        return True

    def delete(self, alias):
        self.panels.pop(alias, None)
        return True

    def listen_press(self, on_press):
        self.pressed.append(on_press)

    def press(self, alias):
        for listener in self.pressed:
            listener(alias)


class IngameMenu(object):

    def __init__(self):
        self.calls = []

    def _populate(self):
        self.calls.append('populate')
        return 'populated'

    def _dispose(self):
        self.calls.append('dispose')

    def destroy(self):
        self.calls.append('destroy')
        self._dispose()


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


class BattleMenuClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        self.purge()
        self.callbacks = []
        for name in STUBBED:
            sys.modules[name] = types.ModuleType(str(name))
        sys.modules['BigWorld'].callback = lambda delay, fn: self.callbacks.append(fn)
        sys.modules['BigWorld'].player = lambda: None
        self.menu_class = type(str('IngameMenu'), (IngameMenu,), {})
        sys.modules[MENU_MODULE].IngameMenu = self.menu_class
        self.backend = Backend()
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state.update({'config': ComponentConfig(MemoryFile()), 'backend': self.backend})
        module = importlib.import_module('otmetki.features.battle_menu.client')
        self.app = App()
        self.opened = []
        self.app.bus.on(EVENT_SETTINGS_OPEN, self.opened.append)
        self.entry = module.BattleMenuEntry(self.app)

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

    def open_menu(self):
        menu = self.menu_class()
        menu._populate()
        return menu

    def next_frame(self):
        callbacks, self.callbacks = self.callbacks, []
        for callback in callbacks:
            callback()

    def test_the_menu_still_populates(self):
        assert self.menu_class()._populate() == 'populated'

    def test_the_esc_menu_brings_the_button(self):
        self.open_menu()

        assert ALIAS in self.backend.panels

    def test_closing_the_menu_takes_the_button_off(self):
        menu = self.open_menu()

        menu._dispose()

        assert ALIAS not in self.backend.panels

    def test_a_press_closes_the_menu(self):
        menu = self.open_menu()

        self.backend.press(ALIAS)

        assert 'destroy' in menu.calls

    def test_a_press_opens_the_settings_at_the_battle_page_on_the_next_frame(self):
        self.open_menu()
        self.backend.press(ALIAS)

        self.next_frame()

        assert self.opened == ['battle']

    def test_the_window_waits_until_the_menu_is_gone(self):
        self.open_menu()

        self.backend.press(ALIAS)

        assert self.opened == []

    def test_a_press_of_another_button_is_ignored(self):
        self.open_menu()

        self.backend.press('otmetki.ui.button')
        self.next_frame()

        assert self.opened == []

    def test_switched_off_there_is_no_button(self):
        self.app.config.on = False

        self.open_menu()

        assert ALIAS not in self.backend.panels

    def test_without_buttons_on_the_page_there_is_no_button(self):
        self.backend.buttons = False

        self.open_menu()

        assert ALIAS not in self.backend.panels


if __name__ == '__main__':
    unittest.main()
