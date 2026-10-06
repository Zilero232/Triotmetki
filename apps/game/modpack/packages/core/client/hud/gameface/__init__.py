"""OpenWG Gameface as a HUD backend: the ui package's HUD page (`packages/ui/gameface/hud.html`, registered as
`otmetki/ui/hud` in its res_map) draws every label from inside the client's own Scaleform views
(docs/specs/2026-10-06-gameface-inject-host.md): the hangar view in the lobby, the battle page in battle
(`inject_page`). Both pages get the same state and send the same messages; the one of the current GUI space is the
page on the screen.

OpenWG Gameface (openwg_gameface, MIT) only registers resources and injects scripts; the page is the client's wulf
`ViewImpl`, added as a child view of the main window by the client's own `InjectComponentAdaptor`, so it is no window:
it takes no keyboard focus and has no layer of its own, and the view it sits in decides when it is on the screen. The
pages start with the first label and stay with their views for the rest of the session. Without OpenWG Gameface or the
client's inject classes there is no backend (`core.client.hud.build_backend` logs why) and every stock element stays.
On Lesta, OpenWG Gameface restarts the client once after an install or update changed its res_map
(`restart_pending`): that session only logs it.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os

import BigWorld

from ....events import Listeners
from ....hud import HudBackend
from ....hud.icons import resolve
from ....hud.surface import HUD_RES_MAP_ID, SPACE_BATTLE, SPACE_LOBBY, FramePush, HudSurface
from ....log import log, safe
from ...inject import page_layout
from ...inject.page import IMPORT_ERROR as PAGE_IMPORT_ERROR
from ...timer import Ticker
from ..icons import client_file_exists
from ..inject_page import PLACES, InjectPage, pages_usable
from ..modifier import ModifierWatch
from ..space import current_space, cursor_events, cursor_visible
from .constants import CURSOR_POLL_S, RESTART_FLAG_FILE

try:
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


def _next_frame(callback):
    BigWorld.callback(0, safe(callback))


class GamefaceBackend(HudBackend):

    name = 'gameface'

    def __init__(self):
        self.surface = HudSurface()
        self.pusher = FramePush(_next_frame, self._view_state, self._set_view_state)
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
        self.cursor_poll = Ticker(CURSOR_POLL_S, self._poll_cursor)
        self.pages = [InjectPage(self, place) for place in PLACES] if self.usable() else []
        self.started = False
        self._listen_cursor()
        if self.usable() and restart_pending():
            log(
                'HUD: OpenWG Gameface is restarting the client to apply its res_map '
                '(the first start after an install or update)'
            )

    @classmethod
    def usable(cls):
        return IMPORT_ERROR is None and pages_usable()

    @classmethod
    def missing_reason(cls):
        if IMPORT_ERROR is not None:
            return 'OpenWG Gameface: %s' % IMPORT_ERROR
        return 'the client has no inject adaptor for the HUD page (%s)' % PAGE_IMPORT_ERROR

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

    def _current(self):
        space = current_space()
        for page in self.pages:
            if page.place.space == space:
                return page
        return None

    # The page on the screen: the loaded page of the current GUI space.
    def _page(self):
        page = self._current()
        return page.view if page is not None else None

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
        if self.surface.aliases(current_space()):
            self._start()
        self.push_state()
        return True

    def _start(self):
        if self.started:
            return
        self.started = True
        self.modifier.install()
        log('HUD: the panels are drawn inside the %s' % ' and the '.join(page.place.name for page in self.pages))
        for page in self.pages:
            page.start()

    def editing(self):
        return self._editing_in(current_space())

    def _editing_in(self, space):
        return self.modifier.held if space == SPACE_LOBBY else self.cursor

    # A page takes the mouse only while the player edits there: every other click reaches the view under it (the
    # hangar, its camera drag; the battle page, the minimap and the team lists under the cursor).
    def _apply_mouse(self):
        for page in self.pages:
            page.set_mouse(self._editing_in(page.place.space))

    @safe
    def on_inject_page(self, page, view):
        self.drawn_seen = frozenset()
        self.whole_area = None
        if page.place.space == SPACE_BATTLE:
            self.seen_edit = False
            self.seen_mouse = set()
            self._check_cursor()
        if page is self._current():
            self._set_drawn(None)
        self._apply_mouse()
        self.pusher.forget()
        self.pusher.flush()

    @safe
    def on_inject_message(self, page, raw):
        if page is self._current():
            self.on_message(raw)

    @safe
    def on_inject_gone(self, page):
        if page.place.space == SPACE_BATTLE and self.seen_edit and not self.seen_mouse:
            log('HUD: the battle cursor was shown, but the page saw no mouse over a panel')
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
        labels = self.surface.summary(current_space())
        page = self._current()
        where = page.place.name if page is not None else current_space()
        log('HUD: Gameface page ready in the %s (%d labels: %s)' % (where, len(labels), ', '.join(labels)))
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
        self._apply_mouse()
        self.push_state()

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
        in_battle = current_space() == SPACE_BATTLE
        if visible and in_battle:
            self.cursor_poll.start()
        if visible and in_battle and not self.seen_edit and self._page() is not None:
            self.seen_edit = True
            log('HUD: battle cursor shown, panels can be dragged')
        self._apply_mouse()
        self.push_state()

    def _on_page_mouse(self, fields):
        event = fields['event']
        if event not in self.seen_mouse:
            self.seen_mouse.add(event)
            log('HUD: the page saw the mouse in edit mode (%s, %s)' % (event, current_space()))
