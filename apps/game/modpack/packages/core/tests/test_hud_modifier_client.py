from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

MODIFIER_MODULE = 'otmetki.core.client.hud.modifier'
STUB_MODULES = ('BigWorld', 'Keys')
KEY_LALT = 56
KEY_RALT = 184


class KeyState(object):

    def __init__(self):
        self.client = set()
        self.windows = set()
        self.in_front = True

    def client_down(self, code):
        return code in self.client

    def windows_down(self, name):
        return name in self.windows

    def front(self):
        return self.in_front


def _module(name, **attrs):
    module = types.ModuleType(str(name))
    module.__dict__.update(attrs)
    return module


class ModifierWatchTest(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = dict((name, sys.modules.get(name)) for name in STUB_MODULES)
        self.keys = KeyState()
        sys.modules['BigWorld'] = _module('BigWorld', isKeyDown=self.keys.client_down, callback=lambda delay, fn: None)
        sys.modules['Keys'] = _module('Keys', KEY_LALT=KEY_LALT, KEY_RALT=KEY_RALT)
        sys.modules.pop(MODIFIER_MODULE, None)
        self.module = importlib.import_module(MODIFIER_MODULE)
        self.module.os_key_down = self.keys.windows_down
        self.module.game_in_front = self.keys.front
        self.lines = []
        self.module.log = self.lines.append
        self.changes = []
        self.watch = self.module.ModifierWatch(self.changes.append, lambda: None)

    def tearDown(self):
        _support.drop_modules(set(sys.modules) - self.loaded)
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def press_alt(self):
        self.keys.client.add(KEY_LALT)
        self.keys.windows.add('KEY_LALT')
        self.watch.check()

    def test_alt_held_in_the_game_is_held(self):
        self.press_alt()

        self.assertTrue(self.watch.held)

    def test_alt_released_while_the_game_was_in_the_background_is_released(self):
        self.press_alt()
        self.keys.windows.discard('KEY_LALT')

        self.watch.check()

        self.assertFalse(self.watch.held)

    def test_the_release_the_client_missed_reaches_the_backend(self):
        self.press_alt()
        self.keys.windows.discard('KEY_LALT')

        self.watch.check()

        self.assertEqual(self.changes, [True, False])

    def test_alt_still_down_after_alt_tab_counts_only_while_the_game_is_in_front(self):
        self.press_alt()
        self.keys.in_front = False

        self.watch.check()

        self.assertFalse(self.watch.held)

    def test_a_stuck_client_key_is_logged_once(self):
        self.press_alt()
        self.keys.windows.discard('KEY_LALT')

        self.watch.check()
        self.watch.check()

        self.assertEqual(len(self.lines), 1)

    def test_the_release_poll_stops_once_the_stuck_key_is_seen(self):
        self.press_alt()
        self.keys.windows.discard('KEY_LALT')

        self.assertFalse(self.watch._on_poll())

    def test_the_client_state_alone_decides_when_windows_cannot_tell(self):
        self.module.os_key_down = lambda name: None
        self.module.game_in_front = lambda: None
        self.keys.client.add(KEY_LALT)

        self.watch.check()

        self.assertTrue(self.watch.held)

    def test_a_key_only_windows_reports_is_not_held(self):
        self.keys.windows.add('KEY_LALT')

        self.watch.check()

        self.assertFalse(self.watch.held)


if __name__ == '__main__':
    unittest.main()
