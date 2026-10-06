from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

STUBBED = ('BigWorld', 'frameworks', 'frameworks.wulf', 'game', 'gui', 'gui.impl', 'gui.impl.pub', 'openwg_gameface')
GAMEFACE_MODULE = 'otmetki.core.client.hud.gameface'
LAST_FOCUS_MODULE = GAMEFACE_MODULE + '.last_focus'


class Constants(object):
    WINDOW = 1
    VIEW = 1
    LOADED = 3
    DESTROYING = 5
    DESTROYED = 6


class StockWindow(object):

    def __init__(self):
        self.changes = []

    def _cFocusChanged(self, focused):
        self.changes.append(focused)


class ClientWindow(object):

    def __init__(self, wndFlags=None, content=None, layer=None, parent=None):
        self.shown = []
        self.focus_changes = []
        self.uniqueID = 7
        self.isFocused = False
        self.layer = 7
        self.typeFlag = 1

    def show(self, focus=True):
        self.shown.append(focus)

    def _onReady(self):
        self.show()

    def _onFocus(self, focused):
        self.focus_changes.append(focused)


class BackendSpy(object):

    def __init__(self):
        self.focus = []

    def on_window_focus(self, window, focused):
        self.focus.append((window.uniqueID, focused))


class OtherWindow(object):

    def __init__(self, unique_id, layer, type_flag=98):
        self.uniqueID = unique_id
        self.layer = layer
        self.typeFlag = type_flag
        self.windowStatus = Constants.LOADED
        self.focus_tries = 0
        self.hidden = False

    def isHidden(self):
        return self.hidden

    def tryFocus(self):
        self.focus_tries += 1


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
    wulf.Window = type(str('Window'), (StockWindow,), {})
    wulf.ViewSettings = lambda layout, flags=None, model=None: None
    sys.modules['gui.impl.pub'].WindowImpl = ClientWindow
    sys.modules['gui.impl.pub'].ViewImpl = ClientView


class HudWindowTest(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED + (GAMEFACE_MODULE,))
        install_stubs()
        sys.modules.pop(GAMEFACE_MODULE, None)
        self.gameface = importlib.import_module(GAMEFACE_MODULE)
        self.main = OtherWindow(1, 1)
        self.lobby = OtherWindow(4, 4)
        self.windows = [self.main, self.lobby]
        self.callbacks = []
        self.gameface.main_window = lambda: self.main
        self.gameface.client_windows = lambda: self.windows
        self.gameface.current_space = lambda: 'lobby'
        self.gameface.game_time = lambda: 100.0
        self.gameface._next_frame = self.callbacks.append
        self.later = []
        self.gameface._later = lambda delay, callback: self.later.append((delay, callback))
        self.cursor = [True]
        self.gameface.cursor_visible = lambda: self.cursor[0]
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

    def focused_backend(self):
        backend = self.gameface.GamefaceBackend()
        window = ClientWindow()
        window.isFocused = True
        backend.window = window
        self.windows.append(window)
        return backend, window

    def run_frames(self):
        while self.callbacks:
            self.callbacks.pop(0)()

    def test_a_focus_the_window_took_goes_back_to_the_page_under_it(self):
        backend, window = self.focused_backend()

        backend.on_window_focus(window, True)
        self.run_frames()

        self.assertEqual(self.lobby.focus_tries, 1)

    def test_the_focus_is_handed_on_a_frame_later(self):
        backend, window = self.focused_backend()

        backend.on_window_focus(window, True)

        self.assertEqual(self.lobby.focus_tries, 0)

    def test_the_hand_on_is_logged_once(self):
        backend, window = self.focused_backend()

        backend.on_window_focus(window, True)
        self.run_frames()

        expected = 'HUD: Gameface window 7 took the focus in the lobby, handing it to OtherWindow 4'
        self.assertEqual(self.lines[-1], expected)

    def test_the_main_window_gets_the_focus_without_a_page(self):
        backend, window = self.focused_backend()
        self.windows.remove(self.lobby)

        backend.on_window_focus(window, True)
        self.run_frames()

        self.assertEqual(self.main.focus_tries, 1)

    def test_a_lost_focus_is_left_alone(self):
        backend, window = self.focused_backend()
        window.isFocused = False

        backend.on_window_focus(window, False)
        self.run_frames()

        self.assertEqual(self.lobby.focus_tries, 0)

    def test_the_focus_stays_while_a_panel_is_dragged(self):
        backend, window = self.focused_backend()
        backend.modifier.held = True

        backend.on_window_focus(window, True)
        self.run_frames()

        self.assertEqual(self.lobby.focus_tries, 0)

    def test_the_focus_is_handed_on_when_the_drag_key_is_released(self):
        backend, window = self.focused_backend()
        backend.modifier.held = True
        backend.on_window_focus(window, True)
        backend.modifier.held = False

        backend._on_modifier(False)
        self.run_frames()

        self.assertEqual(self.lobby.focus_tries, 1)

    def test_a_focus_of_a_window_already_replaced_is_left_alone(self):
        backend, window = self.focused_backend()

        backend.on_window_focus(ClientWindow(), True)
        self.run_frames()

        self.assertEqual(self.lobby.focus_tries, 0)

    def test_the_focus_goes_back_to_the_window_that_had_it(self):
        backend, window = self.focused_backend()
        battle_page = OtherWindow(86, 4)
        backend.last_focus.remember(battle_page)

        backend.on_window_focus(window, True)
        self.run_frames()

        self.assertEqual(battle_page.focus_tries, 1)

    def test_the_window_that_had_the_focus_wins_over_the_topmost_page(self):
        backend, window = self.focused_backend()
        chat = OtherWindow(30, 4)
        top = OtherWindow(31, 10)
        self.windows.extend([chat, top])
        backend.last_focus.remember(chat)

        backend.on_window_focus(window, True)
        self.run_frames()

        self.assertEqual(top.focus_tries, 0)

    def test_a_destroyed_window_that_had_the_focus_is_skipped(self):
        backend, window = self.focused_backend()
        gone = OtherWindow(30, 10)
        gone.windowStatus = Constants.DESTROYED
        backend.last_focus.remember(gone)

        backend.on_window_focus(window, True)
        self.run_frames()

        self.assertEqual(self.lobby.focus_tries, 1)

    def test_a_hidden_window_that_had_the_focus_is_skipped(self):
        backend, window = self.focused_backend()
        hidden = OtherWindow(30, 10)
        hidden.hidden = True
        backend.last_focus.remember(hidden)

        backend.on_window_focus(window, True)
        self.run_frames()

        self.assertEqual(hidden.focus_tries, 0)

    def bounce_focus(self, backend, window):
        for _ in range(4):
            backend.on_window_focus(window, True)
            self.run_frames()

    def test_the_backend_tries_again_after_giving_the_focus_up(self):
        backend, window = self.focused_backend()

        self.bounce_focus(backend, window)

        self.assertEqual([delay for delay, _ in self.later], [1.0])

    def test_the_retry_hands_the_focus_on(self):
        backend, window = self.focused_backend()
        self.bounce_focus(backend, window)
        tries = self.lobby.focus_tries

        self.later[0][1]()

        self.assertEqual(self.lobby.focus_tries, tries + 1)

    def test_the_page_input_area_is_logged_once_per_change(self):
        backend = self.gameface.GamefaceBackend()

        for whole in (False, False, True, True, False):
            backend._on_page_area({'whole': whole})

        area_lines = [line for line in self.lines if 'takes the mouse' in line]
        self.assertEqual(len(area_lines), 3)

    def test_a_whole_screen_input_area_is_logged_with_the_edit_state(self):
        backend = self.gameface.GamefaceBackend()

        backend._on_page_area({'whole': True})

        self.assertEqual(self.lines[-1], 'HUD: the page takes the mouse over the whole screen (lobby, not editing)')

    def battle_backend(self):
        self.gameface.current_space = lambda: 'battle'
        backend = self.gameface.GamefaceBackend()
        backend.cursor_poll.start = lambda: None
        backend._set_cursor(True)
        return backend

    def test_a_cursor_hidden_without_an_event_ends_the_battle_edit(self):
        backend = self.battle_backend()
        self.cursor[0] = False

        backend._poll_cursor()

        self.assertFalse(backend.editing())

    def test_a_cursor_hidden_without_an_event_is_logged(self):
        backend = self.battle_backend()
        self.cursor[0] = False

        backend._poll_cursor()

        expected = 'HUD: the battle cursor was hidden without an event, the panels stop taking the mouse'
        self.assertEqual(self.lines[-1], expected)

    def test_the_cursor_poll_stops_once_the_cursor_is_hidden(self):
        backend = self.battle_backend()
        self.cursor[0] = False

        self.assertFalse(backend._poll_cursor())

    def test_the_cursor_poll_goes_on_while_the_cursor_is_shown(self):
        backend = self.battle_backend()

        self.assertTrue(backend._poll_cursor())

    def test_the_cursor_poll_starts_when_the_battle_cursor_shows(self):
        self.gameface.current_space = lambda: 'battle'
        backend = self.gameface.GamefaceBackend()
        started = []
        backend.cursor_poll.start = lambda: started.append(True)

        backend._set_cursor(True)

        self.assertEqual(started, [True])


class LastFocusTest(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        install_stubs()
        sys.modules.pop(LAST_FOCUS_MODULE, None)
        self.module = importlib.import_module(LAST_FOCUS_MODULE)
        self.Window = sys.modules['frameworks.wulf'].Window
        self.own = self.Window()
        self.tracker = self.module.LastFocus(lambda window: window is self.own)
        self.tracker.install()

    def tearDown(self):
        _support.drop_modules(set(sys.modules) - self.loaded)
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_a_client_window_that_takes_the_focus_is_remembered(self):
        page = self.Window()

        page._cFocusChanged(True)

        self.assertIs(self.tracker.window(), page)

    def test_the_client_still_hears_the_focus_change(self):
        page = self.Window()

        page._cFocusChanged(True)

        self.assertEqual(page.changes, [True])

    def test_the_hud_window_itself_is_never_remembered(self):
        page = self.Window()
        page._cFocusChanged(True)

        self.own._cFocusChanged(True)

        self.assertIs(self.tracker.window(), page)

    def test_a_lost_focus_is_not_remembered(self):
        page = self.Window()

        page._cFocusChanged(False)

        self.assertIsNone(self.tracker.window())

    def test_installing_twice_wraps_the_client_once(self):
        page = self.Window()
        self.tracker.install()

        page._cFocusChanged(True)

        self.assertEqual(page.changes, [True])


if __name__ == '__main__':
    unittest.main()
