"""What covers the battle view, from every source at once (pure; `core.client.hud.cover` reads the client).

`CoverState` keeps, per source (`constants.SOURCES`: V, the loading screen, the battle page, the Gameface windows), the
reasons it reports right now; a reason is on while any source reports it, so two overlays that overlap (Tab over the
overview map, the loading screen and the page's own hiding) never turn the panels on between them, and a source that
goes quiet takes only its own reasons away. Every source reports its whole current set, never a
toggle, so a missed close event is put right by the next report. `reasons(windows=False)` leaves out the game windows
(`constants.WINDOW_REASONS`) for the "hide panels under game windows" switch turned off.

`FollowedComponents` keeps which of the stock components our panels sit beside (`core.hud.stock.FOLLOWED_ALIASES`:
the consumables panel, the minimap) are off the screen now: the page hides and shows them through the same
`_setComponentsVisibility` calls, answers `as_isComponentVisibleS` for a page that started without one (a reconnect
after death), and the pre-battle setups panel takes the consumables panel's place while it is open.

`PageOverlays` follows a battle page from its `_setComponentsVisibility(visible, hidden)` calls and from snapshots of
the visible components: the panels hide while the page hides its reference component (`REFERENCE_ALIASES`, the XVM
technique: the page hides it only with its whole HUD) or shows a covering one (`PAGE_ALIAS_REASONS`); a snapshot only
ever uncovers. `window_reason(window)` decides one Gameface window (`{alive, own, scaleform, hidden, flags}`).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ..layer.constants import COVER_FULL_STATS, COVER_SCREEN
from ..stock.constants import CONSUMABLES_PANEL, FOLLOWED_ALIASES
from .constants import (
    CHECK_INTERVAL_S,
    HIDE_UNDER_WINDOWS_KEY,
    PAGE_ALIAS_REASONS,
    REASONS,
    REFERENCE_ALIASES,
    SOURCES,
    WINDOW_FULLSCREEN,
    WINDOW_REASONS,
    WINDOW_TYPE_MASK,
    WINDOW_TYPES,
)

__all__ = (
    'CHECK_INTERVAL_S',
    'HIDE_UNDER_WINDOWS_KEY',
    'REASONS',
    'SOURCES',
    'CoverState',
    'FollowedComponents',
    'PageOverlays',
    'covering_aliases',
    'window_reason',
)


class CoverState(object):

    def __init__(self):
        self.sources = {}

    def report(self, source, reasons):
        """`source` sees exactly `reasons` now; returns whether that changed anything."""
        reasons = frozenset(reason for reason in reasons or () if reason in REASONS)
        if self.sources.get(source, frozenset()) == reasons:
            return False
        if reasons:
            self.sources[source] = reasons
        else:
            self.sources.pop(source, None)
        return True

    def reset(self, keep=()):
        """Forget every source but the ones in `keep`."""
        self.sources = {source: reasons for source, reasons in self.sources.items() if source in keep}

    def reasons(self, windows=True):
        found = frozenset()
        for reasons in self.sources.values():
            found = found | reasons
        if not windows:
            found = found - frozenset(WINDOW_REASONS)
        return found

    @property
    def covered(self):
        return bool(self.sources)


def covering_aliases(extra=None):
    """Every page alias that covers the battle view, with the page's own full stats alias (`extra`)."""
    aliases = set()
    for names, _ in PAGE_ALIAS_REASONS:
        aliases.update(names)
    if extra:
        aliases.add(extra)
    return frozenset(aliases)


class PageOverlays(object):

    def __init__(self, full_stats_alias=None):
        self.full_stats_alias = full_stats_alias
        self.aliases = covering_aliases(full_stats_alias)
        self.visible = frozenset()
        self.seen = frozenset()
        self.hidden_references = frozenset()

    def changed(self, visible=None, hidden=None):
        """The page shows `visible` and hides `hidden` (any iterables); returns whether its cover changed."""
        shown, gone = _names(visible), _names(hidden)
        covering = (self.visible | (self.aliases & shown)) - (self.aliases & gone - shown)
        seen = self.seen | (_REFERENCES & (shown | gone))
        hidden_references = (self.hidden_references | (_REFERENCES & gone)) - shown
        return self._set(covering, seen, hidden_references)

    def snapshot(self, visible):
        """Every component the page shows now (its `as_getComponentsVisibilityS()`); None leaves the state. A shown
        reference uncovers; a missing one never covers (a page may simply not have it)."""
        if visible is None:
            return False
        shown = _names(visible)
        return self._set(self.aliases & shown, self.seen | (_REFERENCES & shown), self.hidden_references - shown)

    @property
    def reference(self):
        """The reference component this page has (the first of REFERENCE_ALIASES it ever named), or None."""
        for alias in REFERENCE_ALIASES:
            if alias in self.seen:
                return alias
        return None

    def reasons(self):
        found = set()
        for names, reason in PAGE_ALIAS_REASONS:
            if self.visible & frozenset(names):
                found.add(reason)
        if self.full_stats_alias in self.visible or self.reference in self.hidden_references:
            found.add(COVER_FULL_STATS)
        return frozenset(found)

    def _set(self, covering, seen, hidden_references):
        before = self.reasons()
        self.visible = frozenset(covering)
        self.seen = frozenset(seen)
        self.hidden_references = frozenset(hidden_references)
        return self.reasons() != before


_REFERENCES = frozenset(REFERENCE_ALIASES)
_FOLLOWED = frozenset(FOLLOWED_ALIASES)
_SETUPS_HIDE = frozenset((CONSUMABLES_PANEL,))


class FollowedComponents(object):

    def __init__(self):
        self.page_hidden = frozenset()
        self.setups_shown = False

    def changed(self, visible=None, hidden=None):
        """The page shows `visible` and hides `hidden`; returns whether `hidden` (the property) changed."""
        shown, gone = _names(visible), _names(hidden)
        return self._set((self.page_hidden | (_FOLLOWED & gone)) - shown, self.setups_shown)

    def answered(self, alias, visible):
        """The page's `as_isComponentVisibleS(alias)`; anything but a flag leaves the state."""
        if alias not in _FOLLOWED or not isinstance(visible, bool):
            return False
        if visible:
            return self._set(self.page_hidden - frozenset((alias,)), self.setups_shown)
        return self._set(self.page_hidden | frozenset((alias,)), self.setups_shown)

    def setups(self, shown):
        """The pre-battle setups panel opened (True) or closed (False) in the consumables panel's place."""
        return self._set(self.page_hidden, bool(shown))

    def forget_page(self):
        """A new page: what the old one hid is gone; the setups panel (it may open before the page) stays."""
        return self._set(frozenset(), self.setups_shown)

    @property
    def hidden(self):
        return self.page_hidden | (_SETUPS_HIDE if self.setups_shown else frozenset())

    def _set(self, page_hidden, setups_shown):
        before = self.hidden
        self.page_hidden = frozenset(page_hidden)
        self.setups_shown = setups_shown
        return self.hidden != before


def _names(aliases):
    try:
        return frozenset(alias for alias in aliases or () if alias)
    except TypeError:
        return frozenset()


def window_reason(window):
    """The reason one Gameface window gives (`COVER_SCREEN`) or None. `window` holds `alive`, `own` (our HUD or settings
    window), `scaleform` (an SFWindow: a Scaleform view, the battle page decides those), `hidden` and the wulf
    `flags`."""
    if not window.get('alive', True) or window.get('own') or window.get('scaleform') or window.get('hidden'):
        return None
    flags = window.get('flags') or 0
    if (flags & WINDOW_TYPE_MASK) in WINDOW_TYPES and flags & WINDOW_FULLSCREEN:
        return COVER_SCREEN
    return None

