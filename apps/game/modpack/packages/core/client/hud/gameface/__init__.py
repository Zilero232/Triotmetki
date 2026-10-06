"""OpenWG Gameface as a HUD backend: one transparent Gameface window, the ui package's HUD page
(`packages/ui/gameface/hud.html`, registered as `otmetki/ui/hud` in its res_map), draws every label.

OpenWG Gameface (openwg_gameface, MIT) only registers resources and injects scripts; the window itself is the
client's wulf `WindowImpl` + `ViewImpl`, the same classes the settings window uses. The client opens Gameface
windows in battle too (RU 1.45 client source: `PopOverWindow(..., WindowLayer.TOP_WINDOW)` in the prebattle
ammunition panel, the Gameface tooltips of the battle full stats). UNVERIFIED on Lesta 1.45: that a
non-modal WINDOW over the battle page takes no keyboard focus and passes the mouse through where the page
has `pointer-events: none`. The window lives only in the hangar and the battle GUI spaces: it is closed when a
space is left and opened again when the lobby or the battle is entered (a window opened on the login screen,
before the lobby app, never showed in the 1.45.0.0 live test), and one the client destroyed is replaced on the
next sync. Any failure to open marks the backend broken, and the chain moves on to GUIFlash.

The window is opened a frame after the space was entered, never from inside the app loader's own space switch
(onGUISpaceEntered fires while the lobby app is still being shown). On Lesta, OpenWG Gameface restarts the client
once after an install or update changed its res_map (`restart_pending`): that session only logs it.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os

import BigWorld

from ....hud import HudBackend
from ....hud.focus import FOCUS_GIVE_UP, FOCUS_HAND_ON, FocusReturn, WindowInfo, focus_target
from ....hud.icons import resolve
from ....hud.surface import (
    HUD_MESSAGE_ARG,
    HUD_RES_MAP_ID,
    HUD_SEND_COMMAND,
    HUD_STATE_PROPERTY,
    SPACE_BATTLE,
    SPACE_LOBBY,
    FramePush,
    HudSurface,
)
from ....log import log, log_exception, safe
from ...game import client_windows, main_window
from ...timer import game_time
from ..icons import client_file_exists
from ..modifier import ModifierWatch
from ..space import current_space, cursor_events, cursor_visible, gui_spaces
from .constants import INVALID_RES_ID, READY_SPACES, RESTART_FLAG_FILE, WINDOW_LAYER

try:
    from frameworks.wulf import ViewFlags, ViewModel, ViewSettings, WindowFlags, WindowLayer, WindowStatus
    from gui.impl.pub import ViewImpl, WindowImpl
    import openwg_gameface
    IMPORT_ERROR = None
except Exception as error:  # any failure inside a third-party import must not stop the core
    openwg_gameface = None
    IMPORT_ERROR = error


def message_of(args):
    if isinstance(args, dict):
        return args.get(HUD_MESSAGE_ARG)
    getter = getattr(args, 'get', None)
    return getter(HUD_MESSAGE_ARG) if getter is not None else None


def layout_id():
    """The resource id of the HUD page, or None until OpenWG Gameface has validated the res_map (or when
    the ui package, which ships the page, is not installed)."""
    finder = getattr(openwg_gameface, 'res_id_by_key', None)
    if finder is None:
        return None
    try:
        found = finder(HUD_RES_MAP_ID)
    except Exception:
        return None
    return found if isinstance(found, int) and found != INVALID_RES_ID else None


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
        # gui/impl/lobby/crew/base_crew_view.py `bringToFront`), so the backend hands every focus on (`core.hud.focus`).
        def _onFocus(self, focused):
            super(HudWindow, self)._onFocus(focused)
            self.backend.on_window_focus(self, focused)

else:
    HudWindow = None


def _next_frame(callback):
    BigWorld.callback(0, safe(callback))


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
        self.listeners = []
        self.press_listeners = []
        self.drawn_listeners = []
        self.drawn = None
        self.cursor = False
        self.seen_edit = False
        self.seen_mouse = set()
        self.modifier = ModifierWatch(self._on_modifier, self._on_key)
        self.loader = None
        self.ready_spaces = ()
        self.waiting = False
        self.settling = False
        self.answered = False
        self.focus = FocusReturn()
        self._listen_cursor()
        self._listen_spaces()
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
        return self.usable() and not self.broken and layout_id() is not None

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

    def renders_widgets(self):
        return self.answered and self.available()

    def drawn_aliases(self):
        return self.drawn if self.view is not None else None

    def listen_drawn(self, on_drawn):
        if on_drawn not in self.drawn_listeners:
            self.drawn_listeners.append(on_drawn)

    def _set_drawn(self, drawn):
        if drawn == self.drawn:
            return
        self.drawn = drawn
        if drawn is not None:
            log('HUD: the page draws %s' % (', '.join(sorted(drawn)) or 'nothing'))
        for listener in list(self.drawn_listeners):
            listener()

    def delete(self, alias):
        return self.surface.delete(alias) and self.sync()

    def listen(self, on_moved):
        if on_moved not in self.listeners:
            self.listeners.append(on_moved)

    def draws_buttons(self):
        return True

    def listen_press(self, on_press):
        if on_press not in self.press_listeners:
            self.press_listeners.append(on_press)

    def set_modifier(self, mode):
        self.modifier.set_mode(mode)

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
        if self.view is not None:
            self.pusher.request()

    def _view_state(self):
        return self.state_text() if self.view is not None else None

    def _set_view_state(self, text):
        self.view.viewModel.set_state(text)

    @safe
    def sync(self):
        if not self.surface.aliases(current_space()):
            self.close()
            return True
        if not self.gui_ready():
            if not self.waiting:
                self.waiting = True
                log('HUD: Gameface window waits for the hangar or the battle (GUI space %s)' % self.loader.getSpaceID())
            return True
        if not self.window_alive() and not self.open():
            return False
        self.push_state()
        return True

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
        layout = layout_id()
        if layout is None or self.broken:
            return False
        try:
            self.modifier.install()
            self.window = HudWindow(layout, self)
            self.window.load()
        except Exception:
            log_exception('HUD: Gameface window')
            log('HUD: the Gameface HUD window failed to open, falling back to GUIFlash')
            self.broken = True
            self.window = None
            return False
        self.waiting = False
        self.seen_edit = False
        self.seen_mouse = set()
        self.focus = FocusReturn()
        log('HUD: Gameface window %s opened in the %s (layout %s)' % (self.window.uniqueID, current_space(), layout))
        self._check_cursor()
        return True

    @safe
    def close(self):
        window, self.window, self.view = self.window, None, None
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
            log('HUD: Gameface window %s keeps the focus, the client keeps giving it back' % window.uniqueID)

    def _hand_on_focus(self):
        window = self._focused_window()
        if window is None or self.editing():
            return
        found = focus_target([window_info(other, window) for other in client_windows()])
        target = found if found is not None else main_window()
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
            self._set_drawn(None)

    @safe
    def on_message(self, raw):
        decoded = self.surface.handle(raw)
        if decoded is None:
            return
        command, fields = decoded
        handlers = {
            'ready': self._on_page_ready,
            'pressed': self._on_page_press,
            'mouse': self._on_page_mouse,
            'moved': self._on_page_move,
            'resized': self._on_page_move,
            'drawn': self._on_page_drawn,
        }
        handlers[command](fields)

    def _on_page_ready(self, fields):
        self.answered = True
        labels = self.surface.summary(current_space())
        log('HUD: Gameface page ready (%d labels: %s)' % (len(labels), ', '.join(labels)))
        self.pusher.forget()
        self.push_state()

    def _on_page_drawn(self, fields):
        self._set_drawn(frozenset(fields['ids']))

    def _on_page_press(self, fields):
        for listener in list(self.press_listeners):
            listener(fields['id'])

    def _on_page_move(self, fields):
        props = dict((key, value) for key, value in fields.items() if key != 'id')
        for listener in list(self.listeners):
            listener(fields['id'], props)

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

    def _set_cursor(self, visible):
        if visible == self.cursor:
            return
        self.cursor = visible
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
