"""The client side of the panel edit modifier: watches the game's own InputHandler key events (hangar and
battle), calls `on_change(held)` when the configured modifier goes down or up and `on_key()` after every key event.

A hold starts when the client reports the modifier down and Windows agrees the key is physically down; from then on
Windows alone says when it ends. BigWorld drops every key whenever its window loses the keyboard focus (on Lesta 1.45
the window loses it within a frame of the HUD page taking the whole hangar, so the hold ended 50 ms after it began),
and keeps a key down whose key-up went to another window (Alt+Tab), which kept the HUD page over the whole hangar.
Without Windows the client's own key state is all there is."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....hooks import subscribe
from ....hud.modifier import DEFAULT_MODIFIER, is_held
from ....log import log, safe
from ...timer import Ticker
from .constants import RELEASE_POLL_S
from .os_input import os_key_down


def _is_down(name):
    import BigWorld
    import Keys
    code = getattr(Keys, name, None)
    return code is not None and bool(BigWorld.isKeyDown(code))


def _os_held(mode):
    states = {}

    def down(name):
        states[name] = os_key_down(name)
        return states[name] is True

    held = is_held(mode, down)
    return None if None in states.values() else held


class ModifierWatch(object):

    def __init__(self, on_change, on_key):
        self.on_change = on_change
        self.on_key = on_key
        self.mode = DEFAULT_MODIFIER
        self.held = False
        self.stale = False
        self.installed = False
        self.poll = Ticker(RELEASE_POLL_S, self._on_poll)

    @safe
    def install(self):
        if self.installed:
            return True
        from gui import InputHandler
        for event in ('onKeyDown', 'onKeyUp'):
            if getattr(InputHandler.g_instance, event, None) is not None:
                subscribe(InputHandler.g_instance, event, self._on_key)
        self.installed = True
        return True

    def set_mode(self, mode):
        self.mode = mode or DEFAULT_MODIFIER
        self.check()

    def _on_key(self, *args):
        self.check()
        self.on_key()

    def _on_poll(self):
        self.check()
        return self.held

    def _held(self):
        os_held = _os_held(self.mode)
        if os_held is None:
            return is_held(self.mode, _is_down)
        if self.held:
            return os_held
        client_held = is_held(self.mode, _is_down)
        stale = client_held and not os_held
        if stale and not self.stale:
            log('HUD: the client still reports the edit modifier held, but Windows reports it released: panels do '
                'not take the mouse')
        self.stale = stale
        return client_held and os_held

    @safe
    def check(self):
        held = self._held()
        if held == self.held:
            return
        self.held = held
        if held:
            self.poll.start()
        self.on_change(held)
