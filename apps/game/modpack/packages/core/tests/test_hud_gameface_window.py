from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

STUBBED = ('BigWorld', 'frameworks', 'frameworks.wulf', 'game', 'gui', 'gui.impl', 'gui.impl.pub', 'openwg_gameface')
GAMEFACE_MODULE = 'otmetki.core.client.hud.gameface'


class Constants(object):
    WINDOW = 1
    VIEW = 1


class ClientWindow(object):

    def __init__(self, wndFlags=None, content=None, layer=None, parent=None):
        self.shown = []
        self.focus_changes = []
        self.uniqueID = 7

    def show(self, focus=True):
        self.shown.append(focus)

    def _onReady(self):
        self.show()

    def _onFocus(self, focused):
        self.focus_changes.append(focused)


class FocusedWindow(object):
    uniqueID = 4


class KeyEvent(object):

    def __init__(self, mouse, down):
        self.mouse = mouse
        self.down = down

    def isMouseButton(self):
        return self.mouse

    def isKeyDown(self):
        return self.down


class BackendSpy(object):

    def __init__(self):
        self.focus = []

    def on_window_focus(self, window, focused):
        self.focus.append((window.uniqueID, focused))


class ClientViewModel(object):

    def __init__(self, properties=0, commands=0):
        pass


class ClientView(object):

    def __init__(self, settings):
        pass


def install_stubs():
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    wulf = sys.modules['frameworks.wulf']
    wulf.ViewFlags = wulf.WindowFlags = wulf.WindowLayer = wulf.WindowStatus = Constants
    wulf.ViewModel = ClientViewModel
    wulf.ViewSettings = lambda layout, flags=None, model=None: None
    sys.modules['gui.impl.pub'].WindowImpl = ClientWindow
    sys.modules['gui.impl.pub'].ViewImpl = ClientView
    sys.modules['game'].handleKeyEvent = lambda event: event.mouse


class HudWindowTest(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED + (GAMEFACE_MODULE,))
        install_stubs()
        sys.modules.pop(GAMEFACE_MODULE, None)
        self.gameface = importlib.import_module(GAMEFACE_MODULE)
        self.gameface.main_window = lambda: None
        self.gameface.focused_windows = lambda: [FocusedWindow()]
        self.gameface.current_space = lambda: 'lobby'
        self.lines = []
        self.gameface.log = self.lines.append

    def tearDown(self):
        _support.drop_modules(set(sys.modules) - self.loaded)
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_the_ready_window_shows_without_taking_the_keyboard_focus(self):
        window = self.gameface.HudWindow(1, None)

        window._onReady()

        self.assertEqual(window.shown, [False])

    def test_a_focus_change_of_the_window_reaches_the_backend(self):
        backend = BackendSpy()
        window = self.gameface.HudWindow(1, backend)

        window._onFocus(True)

        self.assertEqual(backend.focus, [(7, True)])

    def test_a_focus_change_keeps_the_client_handling(self):
        window = self.gameface.HudWindow(1, BackendSpy())

        window._onFocus(False)

        self.assertEqual(window.focus_changes, [False])

    def test_the_backend_logs_which_windows_hold_the_focus_when_its_window_takes_it(self):
        backend = self.gameface.GamefaceBackend()

        backend.on_window_focus(ClientWindow(), True)

        self.assertEqual(self.lines[-1], 'HUD: Gameface window 7 took the focus in the lobby (focus: FocusedWindow 4)')

    def test_a_hangar_press_is_logged_with_the_client_answer(self):
        backend = self.gameface.GamefaceBackend()
        backend.clicks_left = 1

        sys.modules['game'].handleKeyEvent(KeyEvent(mouse=True, down=True))

        expected = 'HUD: a press in the hangar, taken by the client: True (focus: FocusedWindow 4)'
        self.assertEqual(self.lines[-1], expected)

    def test_the_press_reports_stop_after_the_budget(self):
        backend = self.gameface.GamefaceBackend()
        backend.clicks_left = 1
        handle = sys.modules['game'].handleKeyEvent

        handle(KeyEvent(mouse=True, down=True))
        handle(KeyEvent(mouse=True, down=True))

        self.assertEqual(len([line for line in self.lines if 'a press in the hangar' in line]), 1)

    def test_keys_and_releases_are_not_reported(self):
        backend = self.gameface.GamefaceBackend()
        backend.clicks_left = 3
        handle = sys.modules['game'].handleKeyEvent

        handle(KeyEvent(mouse=False, down=True))
        handle(KeyEvent(mouse=True, down=False))

        self.assertEqual(backend.clicks_left, 3)

    def test_the_client_answer_is_returned_unchanged(self):
        backend = self.gameface.GamefaceBackend()
        backend.clicks_left = 1

        handled = sys.modules['game'].handleKeyEvent(KeyEvent(mouse=False, down=True))

        self.assertFalse(handled)


if __name__ == '__main__':
    unittest.main()
