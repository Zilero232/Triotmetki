"""The HUD page inside the Scaleform hangar view: where the Gameface backend draws the lobby panels
(docs/specs/2026-10-06-gameface-inject-host.md, phase 1).

One hud.html with the state and messages of `core.hud.surface`, put into the hangar view by
`core.client.inject.InjectHost` each time the lobby app loads that view. It is a child view of the main window, not a
window, so it takes no keyboard focus; it goes away with the hangar view (research, the store, the queue, the battle)
and comes back with it. The page takes the mouse only while the player edits (`set_mouse`): otherwise the
GFInjectComponent lets every click through to the hangar. A page that cannot be placed, or that does not load within
`HUD_INJECT_LOAD_TIMEOUT_S`, is taken out and logged; its panels stay off the screen until the view loads again. Nothing
goes into the battle page: a page placed there crashed the client natively (0.3.7), so the battle draws from the HUD
window.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....hud.surface import HUD_RES_MAP_ID, SPACE_LOBBY
from ....inject.constants import HUD_INJECT_ALIAS, HUD_INJECT_LOAD_TIMEOUT_S, LOBBY_APP
from ....lobby_view import HANGAR_ALIAS
from ....log import log, safe
from ....vendor import attr
from ...game import lobby_app
from ...inject import InjectHost, page_usable
from ...inject.watch import ViewWatch


@attr.s(frozen=True)
class PagePlace(object):
    """Where a HUD page goes: its GUI space, the alias its component is registered under, the app (`namespace`,
    `get_app`), the views it goes into (`aliases`) and what the log calls them (`name`)."""

    space = attr.ib()
    alias = attr.ib()
    namespace = attr.ib()
    get_app = attr.ib()
    aliases = attr.ib()
    name = attr.ib()


HANGAR = PagePlace(SPACE_LOBBY, HUD_INJECT_ALIAS, LOBBY_APP, lobby_app, (HANGAR_ALIAS,), 'hangar view')


def pages_usable():
    """Whether the client has the classes an injected page needs."""
    return page_usable()


class InjectPage(object):
    """The HUD page of one `place`. `owner` (the Gameface backend) hears `on_inject_page(page, view)` when the page
    loaded, `on_inject_message(page, raw)` for its messages and `on_inject_gone(page)` when it went away. `view` is
    the loaded page view or None."""

    def __init__(self, owner, place):
        self.owner = owner
        self.place = place
        self.host = InjectHost(place.alias, HUD_RES_MAP_ID, self)
        self.watch = ViewWatch(place.namespace, place.aliases, place.get_app, self._on_view, self.host.detach)
        self.started = False
        self.mouse = False
        self.placements = 0

    @property
    def view(self):
        return self.host.view

    def start(self):
        if self.started:
            return
        self.started = True
        if not self.watch.start():
            log('HUD: the client has no app events to find the %s in, its panels are off' % self.place.name)

    def set_mouse(self, enabled):
        self.mouse = bool(enabled)
        self.host.set_mouse(self.mouse)

    @safe
    def _on_view(self, view):
        if self.host.parent is view:
            return
        if not self.host.attach(view):
            self._fail('the page could not be placed in the %s' % self.place.name)
            return
        self.host.set_mouse(self.mouse)
        self.placements += 1
        placement = self.placements
        BigWorld.callback(HUD_INJECT_LOAD_TIMEOUT_S, lambda: self._check_loaded(placement))

    @safe
    def _check_loaded(self, placement):
        if placement == self.placements and self.host.attached() and self.host.view is None:
            self._fail('the page placed in the %s did not load in %d s' % (self.place.name, HUD_INJECT_LOAD_TIMEOUT_S))
            self.host.detach()

    def _fail(self, reason):
        log('HUD: %s, its panels stay off until it loads again (the stock HUD keeps its elements)' % reason)

    def on_page(self, view):
        self.owner.on_inject_page(self, view)

    def on_message(self, raw):
        self.owner.on_inject_message(self, raw)

    def on_gone(self):
        self.owner.on_inject_gone(self)
