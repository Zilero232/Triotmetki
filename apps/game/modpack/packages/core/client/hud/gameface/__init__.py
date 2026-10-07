"""OpenWG Gameface as a HUD backend: the ui package's HUD page (`packages/ui/gameface/hud.html`, registered as
`otmetki/ui/hud` in its res_map) draws every label, in the lobby from inside the Scaleform hangar view
(`inject_page`, docs/specs/2026-10-06-gameface-inject-host.md) and in battle from one transparent Gameface window. Both
get the same state and send the same messages; the one of the current GUI space is the page on the screen. Nothing is
injected into the battle page: a page placed there crashed the client natively within minutes (0.3.7).

OpenWG Gameface (openwg_gameface, MIT) only registers resources and injects scripts; the window itself is the
client's wulf `WindowImpl` + `ViewImpl`, the same classes the settings window uses. The client opens Gameface
windows in battle too (RU 1.45 client source: `PopOverWindow(..., WindowLayer.TOP_WINDOW)` in the prebattle
ammunition panel, the Gameface tooltips of the battle full stats). UNVERIFIED on Lesta 1.45: that a non-modal WINDOW
over the battle page passes the mouse through where the page has `pointer-events: none`; a keyboard focus the engine
gives it is handed back (`on_window_focus`). The window lives only in the battle GUI space: it opens with the first
label and stays open for the rest of the battle, also while no label is up (a lamp that blinks, a notice that comes
and goes would reload the page every time), is closed when the battle is left and opened again when the next one is
entered, and one the client destroyed is replaced on the next sync. Any failure to open marks the window broken, and
the battle panels stay hidden for the rest of the session.

The window is opened a frame after the battle space was entered, never from inside the app loader's own space switch.
The hangar page starts with the first label and stays with the hangar view for the rest of the session; without the
client's inject classes the hangar panels stay off and every stock element stays. On Lesta, OpenWG Gameface restarts
the client once after an install or update changed its res_map (`restart_pending`): that session only logs it.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os

import BigWorld

from ....events import Listeners
from ....hud import HudBackend
from ....hud.focus import FOCUS_GIVE_UP, FOCUS_HAND_ON, FocusReturn, WindowInfo, focus_target
from ....hud.icons import resolve
from ....hud.surface import (
    HUD_RES_MAP_ID,
    HUD_SEND_COMMAND,
    HUD_STATE_PROPERTY,
    SPACE_BATTLE,
    SPACE_LOBBY,
    FramePush,
    HudSurface,
)
from ....inject import message_of
from ....log import log, log_exception, safe
from ...game import client_windows, main_window
from ...inject import page_layout
from ...inject.page import IMPORT_ERROR as PAGE_IMPORT_ERROR
from ...timer import Ticker, game_time
from ..icons import client_file_exists
from ..inject_page import HANGAR, InjectPage, pages_usable
from ..modifier import ModifierWatch
from ..space import current_space, cursor_events, cursor_visible, gui_spaces
from .constants import CURSOR_POLL_S, FOCUS_RETRY_S, READY_SPACES, RESTART_FLAG_FILE, WINDOW_LAYER
from .last_focus import LastFocus

try:
    from frameworks.wulf import ViewFlags, ViewModel, ViewSettings, WindowFlags, WindowLayer, WindowStatus
    from gui.impl.pub import ViewImpl, WindowImpl
    import openwg_gameface
    IMPORT_ERROR = None
except Exception as error:  # any failure inside a third-party import must not stop the core
    openwg_gameface = None
    IMPORT_ERROR = error


# True while OpenWG Gameface restarts the client to apply a new res_map (it writes RESTART_FLAG_FILE, then
# BigWorld.restartGame(), and deletes the flag once the restarted client validated the res_map).
def restart_pending():
    manager = getattr(openwg_gameface, 'manager', None)
    if manager is None or getattr(manager, 'isResMapValidated', True) is not False:
        return False
    return os.path.isfile(RESTART_FLAG_FILE)


if IMPORT_ERROR is None:

    class HudViewModel(ViewModel):

        def __init__(self, properties=1, commands=1):
            super(HudViewModel, self).__init__(properties=properties, commands=commands)

        def _initialize(self):
            super(HudViewModel, self)._initialize()
            self._addStringProperty(HUD_STATE_PROPERTY, '')
            self.send = self._addCommand(HUD_SEND_COMMAND)

        def set_state(self, text):
            self._setString(0, text)

    class HudView(ViewImpl):

        def __init__(self, layout, backend):
            super(HudView, self).__init__(ViewSettings(layout, flags=ViewFlags.VIEW, model=HudViewModel()))
            self.backend = backend

        @property
        def viewModel(self):
            return super(HudView, self).getViewModel()

        def _onLoading(self, *args, **kwargs):
            super(HudView, self)._onLoading(*args, **kwargs)
            self.backend.on_loaded(self)

        def _finalize(self):
            self.backend.on_destroyed(self)
            super(HudView, self)._finalize()

        @safe
        def _on_send(self, args=None):
            self.backend.on_message(message_of(args))

    class HudWindow(WindowImpl):

        def __init__(self, layout, backend):
            self.backend = backend
            super(HudWindow, self).__init__(wndFlags=WindowFlags.WINDOW, content=HudView(layout, backend),
                                            layer=getattr(WindowLayer, WINDOW_LAYER), parent=main_window())

        # RU 1.45 client source: frameworks/wulf/windows_system/window.py `_onReady` calls `self.show()`, whose `focus`
        # defaults to True. The HUD window took the keyboard from the battle page (chat no longer opened).
        def _onReady(self):
            self.show(focus=False)

        # The engine owns the wulf focus: window.py (RU 1.45 client source) only forwards `show(focus)` and `tryFocus()`
        # to the C++ proxy and hears back through `_cFocusChanged`; no window flag or layer the Python side sees opts a
        # window out of it. The engine gave the HUD window the focus unasked when the focused window went away (1.45
        # live log: the lobby's windows destroyed, "focus: HudWindow 9" alone), and from then on the hangar took no
        # click and the chat no key until the game was minimised. The client corrects the engine's pick the same way,
        # with `tryFocus()` on the window that should have it (gui/impl/common/fade_manager.py `_bringToFront`,
        # gui/impl/lobby/crew/base_crew_view.py `bringToFront`), so the backend hands every focus back to the window
        # that had it (`last_focus`: the chat types into the Scaleform page's window, not the main window) or on
        # (`core.hud.focus`).
        def _onFocus(self, focused):
            super(HudWindow, self)._onFocus(focused)
            self.backend.on_window_focus(self, focused)

else:
    HudWindow = None


def _next_frame(callback):
    BigWorld.callback(0, safe(callback))


def _later(delay, callback):
    BigWorld.callback(delay, safe(callback))


def is_hud_window(window):
    return HudWindow is not None and isinstance(window, HudWindow)


def is_shown(window):
    try:
        return window.windowStatus == WindowStatus.LOADED and not window.isHidden()
    except Exception:
        return False


def window_info(window, own):
    ready = window.uniqueID != own.uniqueID and is_shown(window)
    return WindowInfo(window, window.layer, window.typeFlag, ready)


def window_name(window):
    return '%s %s' % (type(window).__name__, window.uniqueID) if window is not None else 'no window'


class GamefaceBackend(HudBackend):

    name = 'gameface'

    def __init__(self):
        self.surface = HudSurface()
        self.pusher = FramePush(_next_frame, self._view_state, self._set_view_state)
        self.window = None
        self.view = None
        self.broken = False
        self.listeners = Listeners('HUD move listener')
        self.drawn_listeners = Listeners('HUD drawn listener')
        self.drawn = None
        self.drawn_seen = frozenset()
        self.layout = None
        self.cursor = False
        self.seen_edit = False
        self.seen_mouse = set()
        self.whole_area = None
        self.modifier = ModifierWatch(self._on_modifier, self._on_key)
        self.loader = None
        self.ready_spaces = ()
        self.waiting = False
        self.settling = False
        self.focus = FocusReturn()
        self.last_focus = LastFocus(is_hud_window)
        self.cursor_poll = Ticker(CURSOR_POLL_S, self._poll_cursor)
        self.hangar = InjectPage(self, HANGAR) if self.usable() and pages_usable() else None
        self.hangar_started = False
        self._listen_cursor()
        self._listen_spaces()
        if self.usable() and self.hangar is None:
            log('HUD: the client has no inject adaptor for the hangar page (%s), the hangar panels are off'
                % PAGE_IMPORT_ERROR)
        if self.usable() and restart_pending():
            log(
                'HUD: OpenWG Gameface is restarting the client to apply its res_map '
                '(the first start after an install or update)'
            )

    @classmethod
    def usable(cls):
        return IMPORT_ERROR is None

    @classmethod
    def missing_reason(cls):
        return 'OpenWG Gameface: %s' % (IMPORT_ERROR or 'not installed')

    def available(self):
        return self.usable() and self.layout_id() is not None

    # The page's resource id never changes once OpenWG Gameface validated its res_map: looked up until then, and kept.
    def layout_id(self):
        if self.layout is None:
            self.layout = page_layout(HUD_RES_MAP_ID)
        return self.layout

    def create(self, alias, props):
        self.surface.create(alias, self._checked(props), current_space())
        if self.sync():
            return True
        self.surface.delete(alias)
        return False

    def update(self, alias, props):
        return self.surface.update(alias, self._checked(props)) and self.sync()

    @staticmethod
    def _checked(props):
        if isinstance(props, dict) and isinstance(props.get('widget'), dict):
            props = dict(props, widget=resolve(props['widget'], client_file_exists))
        return props

    def drawn_aliases(self):
        return self.drawn if self._page() is not None else None

    def listen_drawn(self, on_drawn):
        self.drawn_listeners.add(on_drawn)

    # A lamp that blinks or a notice that comes and goes changes the drawn set every few seconds: only a label drawn
    # for the first time since its page loaded is logged.
    def _set_drawn(self, drawn):
        if drawn == self.drawn:
            return
        self.drawn = drawn
        first = drawn - self.drawn_seen if drawn is not None else frozenset()
        if first:
            self.drawn_seen = self.drawn_seen | first
            log('HUD: the page draws %s for the first time' % ', '.join(sorted(first)))
        self.drawn_listeners.notify()

    def delete(self, alias):
        return self.surface.delete(alias) and self.sync()

    def listen(self, on_moved):
        self.listeners.add(on_moved)

    def set_modifier(self, mode):
        self.modifier.set_mode(mode)

    # The page on the screen: the hangar view's in the lobby, the HUD window's in battle.
    def _page(self):
        space = current_space()
        if space == SPACE_LOBBY:
            return self.hangar.view if self.hangar is not None else None
        return self.view if space == SPACE_BATTLE else None

    # Panels move while the edit modifier is held in the hangar, where the cursor is always shown, and whenever the
    # battle cursor is shown (Ctrl): in battle the cursor key alone is the edit key.
    def state_text(self):
        space = current_space()
        if space == SPACE_LOBBY:
            return self.surface.encode(space, True, self.modifier.held)
        return self.surface.encode(space, self.cursor, self.cursor)

    # Every label change of a frame (a 10 Hz gun traverse scale next to the clock and the logs) becomes one push of the
    # whole state on the next frame, and an unchanged state is not pushed again.
    def push_state(self):
        if self._page() is not None:
            self.pusher.request()

    def _view_state(self):
        return self.state_text() if self._page() is not None else None

    def _set_view_state(self, text):
        self._page().viewModel.set_state(text)

    @safe
    def sync(self):
        space = current_space()
        if not self.surface.aliases(space):
            self.push_state()
            return True
        self._start_hangar()
        if space == SPACE_BATTLE and not self._battle_window():
            return False
        self.push_state()
        return True

    def _start_hangar(self):
        if self.hangar is None or self.hangar_started:
            return
        self.hangar_started = True
        self.modifier.install()
        log('HUD: the hangar panels are drawn inside the hangar view')
        self.hangar.start()

    def _battle_window(self):
        if not self.gui_ready():
            if not self.waiting:
                self.waiting = True
                log('HUD: Gameface window waits for the battle (GUI space %s)' % self.loader.getSpaceID())
            return True
        return self.window_alive() or self.open()

    def gui_ready(self):
        return not self.settling and (self.loader is None or self.loader.getSpaceID() in self.ready_spaces)

    def window_alive(self):
        window = self.window
        if window is None:
            return False
        if window.windowStatus in (WindowStatus.DESTROYING, WindowStatus.DESTROYED):
            log('HUD: Gameface window %s was destroyed by the client, opening a new one' % window.uniqueID)
            self.window = None
            self.view = None
            return False
        return True

    def open(self):
        layout = self.layout_id()
        if layout is None or self.broken:
            return False
        try:
            self.modifier.install()
            if not self.last_focus.install():
                log('HUD: the client window class is missing, a focus the HUD window takes goes to the topmost page')
            self.window = HudWindow(layout, self)
            self.window.load()
        except Exception:
            log_exception('HUD: Gameface window')
            log('HUD: the Gameface HUD window failed to open, the battle panels stay hidden')
            self.broken = True
            self.window = None
            return False
        self.waiting = False
        self.drawn_seen = frozenset()
        self.seen_edit = False
        self.seen_mouse = set()
        self.whole_area = None
        self.focus = FocusReturn()
        log('HUD: Gameface window %s opened in the %s (layout %s)' % (self.window.uniqueID, current_space(), layout))
        self._check_cursor()
        return True

    @safe
    def close(self):
        window = self.window
        self.window = None
        self.view = None
        if self._page() is None:
            self._set_drawn(None)
        if window is not None:
            log('HUD: Gameface window %s closed' % window.uniqueID)
            window.destroy()

    @safe
    def on_window_focus(self, window, focused):
        if focused and window is self.window:
            self._settle_focus()

    def editing(self):
        return self.modifier.held if current_space() == SPACE_LOBBY else self.cursor

    def _focused_window(self):
        window = self.window
        return window if window is not None and window.isFocused else None

    def _settle_focus(self):
        window = self._focused_window()
        if window is None:
            return
        decision = self.focus.decide(game_time(), self.editing())
        if decision == FOCUS_HAND_ON:
            _next_frame(self._hand_on_focus)
        elif decision == FOCUS_GIVE_UP:
            log('HUD: Gameface window %s keeps the focus for now, the client keeps giving it back' % window.uniqueID)
            _later(FOCUS_RETRY_S, self._retry_focus)

    def _retry_focus(self):
        self.focus = FocusReturn()
        self._hand_on_focus()

    def _focus_target(self, window):
        previous = self.last_focus.window()
        if previous is not None and window_info(previous, window).ready:
            return previous
        found = focus_target([window_info(other, window) for other in client_windows()])
        return found if found is not None else main_window()

    def _hand_on_focus(self):
        window = self._focused_window()
        if window is None or self.editing():
            return
        target = self._focus_target(window)
        log('HUD: Gameface window %s took the focus in the %s, handing it to %s'
            % (window.uniqueID, current_space(), window_name(target)))
        self.focus.handed_on(game_time())
        if target is not None:
            target.tryFocus()

    @safe
    def on_loaded(self, view):
        log('HUD: Gameface page view loaded')
        view.viewModel.send += view._on_send
        self.view = view
        self._set_drawn(None)
        self.pusher.forget()
        self.pusher.flush()

    @safe
    def on_destroyed(self, view):
        log('HUD: Gameface page view destroyed')
        view.viewModel.send -= view._on_send
        if self.view is view or self.view is None:
            self.view = None
            self.window = None
            if self._page() is None:
                self._set_drawn(None)

    # The hangar page takes the mouse only while the player edits: every other click reaches the hangar, its camera
    # drag included.
    def _hangar_mouse(self):
        if self.hangar is not None:
            self.hangar.set_mouse(self.modifier.held)

    @safe
    def on_inject_page(self, page, view):
        self.drawn_seen = frozenset()
        self.whole_area = None
        if current_space() == SPACE_LOBBY:
            self._set_drawn(None)
        self._hangar_mouse()
        self.pusher.forget()
        self.pusher.flush()

    @safe
    def on_inject_message(self, page, raw):
        if current_space() == SPACE_LOBBY:
            self.on_message(raw)

    @safe
    def on_inject_gone(self, page):
        if self._page() is None:
            self._set_drawn(None)

    @safe
    def on_message(self, raw):
        decoded = self.surface.handle(raw)
        if decoded is None:
            return
        command, fields = decoded
        handlers = {
            'ready': self._on_page_ready,
            'mouse': self._on_page_mouse,
            'moved': self._on_page_move,
            'resized': self._on_page_move,
            'drawn': self._on_page_drawn,
            'area': self._on_page_area,
        }
        handlers[command](fields)

    def _on_page_ready(self, fields):
        space = current_space()
        labels = self.surface.summary(space)
        where = 'in the hangar view' if space == SPACE_LOBBY else 'in the HUD window'
        log('HUD: Gameface page ready %s (%d labels: %s)' % (where, len(labels), ', '.join(labels)))
        self.pusher.forget()
        self.push_state()

    def _on_page_area(self, fields):
        whole = fields['whole']
        if whole == self.whole_area:
            return
        self.whole_area = whole
        editing = 'editing' if self.editing() else 'not editing'
        if whole:
            log('HUD: the page takes the mouse over the whole screen (%s, %s)' % (current_space(), editing))
        else:
            log('HUD: the page takes the mouse only over the panel it edits (%s, %s)' % (current_space(), editing))

    def _on_page_drawn(self, fields):
        self._set_drawn(frozenset(fields['ids']))

    def _on_page_move(self, fields):
        props = {key: value for key, value in fields.items() if key != 'id'}
        self.listeners.notify(fields['id'], props)

    def _listen_spaces(self):
        loader, ids = gui_spaces()
        if loader is None:
            return
        self.loader = loader
        self.ready_spaces = tuple(getattr(ids, name) for name in READY_SPACES)
        loader.onGUISpaceEntered += self._on_space_entered
        loader.onGUISpaceLeft += self._on_space_left

    @safe
    def _on_space_entered(self, space_id):
        log('HUD: GUI space %s entered' % space_id)
        if space_id in self.ready_spaces:
            self.close()
            self.settling = True
            BigWorld.callback(0, self._on_space_settled)

    @safe
    def _on_space_settled(self):
        self.settling = False
        self.sync()

    @safe
    def _on_space_left(self, space_id):
        log('HUD: GUI space %s left' % space_id)
        if self.seen_edit and not self.seen_mouse:
            log('HUD: the battle cursor was shown, but the page saw no mouse over a panel')
        self.close()

    def _listen_cursor(self):
        found = cursor_events()
        if found is None:
            return
        bus, scope, show, hide = found
        bus.addListener(show, self._on_show_cursor, scope)
        bus.addListener(hide, self._on_hide_cursor, scope)

    @safe
    def _on_show_cursor(self, *args):
        self._set_cursor(True)

    @safe
    def _on_hide_cursor(self, *args):
        self._set_cursor(False)

    @safe
    def _on_modifier(self, held):
        self._hangar_mouse()
        self.push_state()
        self._settle_focus()

    # The client shows or hides the battle cursor after the key event (Ctrl), and no event is fired when another view
    # already holds the cursor: read it on the next frame.
    def _on_key(self):
        if current_space() == SPACE_BATTLE:
            _next_frame(self._check_cursor)

    def _check_cursor(self):
        visible = cursor_visible()
        if visible is not None:
            self._set_cursor(visible)

    def _poll_cursor(self):
        visible = cursor_visible()
        if visible is False and self.cursor:
            log('HUD: the battle cursor was hidden without an event, the panels stop taking the mouse')
            self._set_cursor(False)
        return self.cursor

    def _set_cursor(self, visible):
        if visible == self.cursor:
            return
        self.cursor = visible
        if visible and current_space() == SPACE_BATTLE:
            self.cursor_poll.start()
        if visible and not self.seen_edit and current_space() == SPACE_BATTLE and self.window is not None:
            self.seen_edit = True
            log('HUD: battle cursor shown, panels can be dragged')
        self.push_state()
        self._settle_focus()

    def _on_page_mouse(self, fields):
        event = fields['event']
        if event not in self.seen_mouse:
            self.seen_mouse.add(event)
            log('HUD: the page saw the mouse in edit mode (%s, %s)' % (event, current_space()))
