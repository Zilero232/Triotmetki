"""The HUD page inside the Scaleform hangar view: where the Gameface backend draws the hangar panels
(docs/specs/2026-10-06-gameface-inject-host.md, phase 1).

The same hud.html the HUD window shows, with the same state and messages, put into the hangar view by
`core.client.inject.InjectHost` each time the lobby app loads that view. It is a child view of the main window, not a
window, so it takes no focus; it goes away with the hangar view (research, the store, the queue, the battle) and comes
back with it. The page takes the mouse only while the player edits (`set_mouse`): the GFInjectComponent lets every
other click through to the hangar, and while editing the page's own input area decides (the whole page in the hangar).
A page that cannot be placed, or that does not load, is given up for the session (`broken`): the owner then draws the
hangar panels in the HUD window again.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....hud.surface import HUD_RES_MAP_ID
from ....inject.constants import HUD_INJECT_ALIAS, HUD_INJECT_LOAD_TIMEOUT_S, LOBBY_APP
from ....lobby_view import HANGAR_ALIAS
from ....log import log, safe
from ...game import lobby_app
from ...inject import InjectHost, page_usable
from ...inject.watch import ViewWatch


class HangarPage(object):
    """`owner` (the Gameface backend) hears `on_hangar_page(view)` when the page loaded, `on_message(raw)` for its
    messages, `on_hangar_gone()` when it went away and `on_hangar_failed()` once when it is given up. `view` is the
    loaded page view or None."""

    def __init__(self, owner):
        self.owner = owner
        self.host = InjectHost(HUD_INJECT_ALIAS, HUD_RES_MAP_ID, self)
        self.watch = ViewWatch(LOBBY_APP, (HANGAR_ALIAS,), lobby_app, self._on_hangar, self.host.detach)
        self.started = False
        self.broken = False
        self.mouse = False
        self.placements = 0

    @staticmethod
    def usable():
        return page_usable()

    @property
    def view(self):
        return self.host.view

    def start(self):
        if self.started or self.broken:
            return
        self.started = True
        if not self.watch.start():
            self._fail('the client has no app events to find the hangar view in')

    def stop(self):
        if not self.started:
            return
        self.started = False
        self.watch.stop()
        self.host.detach()

    def set_mouse(self, enabled):
        self.mouse = bool(enabled)
        self.host.set_mouse(self.mouse)

    @safe
    def _on_hangar(self, view):
        if self.host.parent is view:
            return
        if not self.host.attach(view):
            self._fail('the page could not be placed in the hangar view')
            return
        self.host.set_mouse(self.mouse)
        self.placements += 1
        placement = self.placements
        BigWorld.callback(HUD_INJECT_LOAD_TIMEOUT_S, lambda: self._check_loaded(placement))

    @safe
    def _check_loaded(self, placement):
        if placement == self.placements and self.host.attached() and self.host.view is None:
            self._fail('the page placed in the hangar view did not load in %d s' % HUD_INJECT_LOAD_TIMEOUT_S)

    def _fail(self, reason):
        if self.broken:
            return
        self.broken = True
        log('HUD: %s, the hangar panels go back to the HUD window' % reason)
        self.stop()
        self.owner.on_hangar_failed()

    def on_page(self, view):
        self.owner.on_hangar_page(view)

    def on_message(self, raw):
        self.owner.on_message(raw)

    def on_gone(self):
        self.owner.on_hangar_gone()
