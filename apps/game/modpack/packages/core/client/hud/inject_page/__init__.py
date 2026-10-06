"""The HUD page inside a Scaleform view: where the Gameface backend draws the panels, in the hangar view and in the
battle page (docs/specs/2026-10-06-gameface-inject-host.md, phases 1 and 2).

One hud.html per place, with the state and messages of `core.hud.surface`, put into the place's view by
`core.client.inject.InjectHost` each time its app loads that view. It is a child view of the main window, not a
window, so it takes no keyboard focus; it goes away with its view (the hangar view with research, the store, the queue
and the battle; the battle page with the battle) and comes back with it. In a battle page it goes under the children
that cover the HUD (`BATTLE_COVERS`: the loading screen, Tab, the radial menu), so they cover it, and V hides it with
the page. The page takes the mouse only while the player edits (`set_mouse`): otherwise the GFInjectComponent lets
every click through to the view under it. A page that cannot be placed, or that does not load within
`HUD_INJECT_LOAD_TIMEOUT_S`, is taken out and logged; its panels stay off the screen until the view loads again, so
the stock HUD keeps every element (a panel replaces one only while the page confirms it drawn).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....hud.modes.constants import PAGE_MODES
from ....hud.surface import HUD_RES_MAP_ID, SPACE_BATTLE, SPACE_LOBBY
from ....inject.constants import (
    BATTLE_APP,
    BATTLE_COVERS,
    HUD_BATTLE_INJECT_ALIAS,
    HUD_INJECT_ALIAS,
    HUD_INJECT_LOAD_TIMEOUT_S,
    LOBBY_APP,
)
from ....lobby_view import HANGAR_ALIAS
from ....log import log, safe
from ....vendor import attr
from ...game import battle_app, lobby_app
from ...inject import InjectHost, page_usable
from ...inject.watch import ViewWatch

try:
    from gui.Scaleform.daapi.view.battle.shared.page import SharedPage
except Exception:  # the battle page moved: the battle pages are found by their aliases alone
    SharedPage = None


def is_battle_page(view):
    """Every battle page (a `SharedPage`: random, ranked, Onslaught, Frontline, the event pages, replays), as the stock
    suppression and the cover watch treat them; by the aliases the HUD layouts know when the class is missing."""
    if SharedPage is not None and isinstance(view, SharedPage):
        return True
    return getattr(view, 'alias', None) in PAGE_MODES


@attr.s(frozen=True)
class PagePlace(object):
    """Where a HUD page goes: its GUI space, the alias its component is registered under, the app (`namespace`,
    `get_app`), the views it goes into (`aliases`, or `matches(view)`), what the log calls them (`name`) and the
    children of the view it goes under (`covers`)."""

    space = attr.ib()
    alias = attr.ib()
    namespace = attr.ib()
    get_app = attr.ib()
    aliases = attr.ib()
    name = attr.ib()
    matches = attr.ib(default=None)
    covers = attr.ib(default=())


HANGAR = PagePlace(SPACE_LOBBY, HUD_INJECT_ALIAS, LOBBY_APP, lobby_app, (HANGAR_ALIAS,), 'hangar view')
BATTLE = PagePlace(
    SPACE_BATTLE, HUD_BATTLE_INJECT_ALIAS, BATTLE_APP, battle_app, tuple(sorted(PAGE_MODES)), 'battle page',
    is_battle_page, BATTLE_COVERS,
)
PLACES = (HANGAR, BATTLE)


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
        self.watch = ViewWatch(
            place.namespace, place.aliases, place.get_app, self._on_view, self.host.detach, place.matches,
        )
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
        self._place_below_covers()
        self.placements += 1
        placement = self.placements
        BigWorld.callback(HUD_INJECT_LOAD_TIMEOUT_S, lambda: self._check_loaded(placement))

    def _place_below_covers(self):
        covers = self.place.covers
        if covers:
            index = self.host.place_below(covers)
            log('HUD: the page went below %s in the %s (index %s)' % ('/'.join(covers), self.place.name, index))

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
