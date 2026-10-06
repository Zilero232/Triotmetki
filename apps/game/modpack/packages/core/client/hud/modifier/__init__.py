"""The client side of the panel edit modifier: watches the game's own InputHandler key events (hangar and
battle), calls `on_change(held)` when the configured modifier goes down or up and `on_key()` after every key event.

The modifier counts as held only while the client, Windows (the physical key) and the foreground window (the game's)
all agree: BigWorld keeps a key down whose key-up went to another window (Alt+Tab), and a stuck modifier kept the HUD
page over the whole hangar, taking every click and the keyboard focus."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....hooks import subscribe
from ....hud.modifier import DEFAULT_MODIFIER, is_held
from ....log import log, safe
from ...timer import Ticker
from .constants import RELEASE_POLL_S
from .os_input import game_in_front, os_key_down


def _is_down(name):
    import BigWorld
    import Keys
    code = getattr(Keys, name, None)
    return code is not None and bool(BigWorld.isKeyDown(code))


def _os_down(name):
    return os_key_down(name) is not False


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
        client_held = is_held(self.mode, _is_down)
        held = client_held and is_held(self.mode, _os_down) and game_in_front() is not False
        stale = client_held and not held
        if stale and not self.stale:
            log('HUD: the client still reports the edit modifier held, but it is released or the game is in the '
                'background: panels stop taking the mouse')
        self.stale = stale
        return held

    @safe
    def check(self):
        held = self._held()
        if held == self.held:
            return
        self.held = held
        if held:
            self.poll.start()
        self.on_change(held)
