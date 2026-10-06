"""Which stock battle HUD elements our panels replace (docs/specs/2026-09-29-hud-visual-redesign.md section 3.2).

`StockSuppression` keeps `{alias: owners}`: a component asks for the stock aliases it replaces with `want(owner,
aliases)` while its Gameface widget is drawn and passes `()` when it stops (switched off, off the page, battle left).
`filter(visible, hidden)` is what the wrapped `SharedPage._setComponentsVisibility` passes on: a suppressed alias never
becomes visible again, however often the page re-shows its components (control mode, Tab, postmortem). The same
bookkeeping, over `RETICLE_PARTS`, keeps the parts of the stock reticle our crosshair readouts draw:
`hide_reticle_parts(vo, parts)` is the settings the crosshair panel gets with those parts at opacity 0. The client side
is `core/client/hud/stock`.

Fair play: a stock element is hidden only while our replacement shows the same or strictly own information.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import is_number
from .constants import (
    BAR_FALLBACK_SLOTS,
    BAR_PITCH,
    BATTLE_DAMAGE_LOG_PANEL,
    BATTLE_TIMER,
    CONSUMABLES_PANEL,
    FOLLOWED_ALIASES,
    FOLLOWED_METRICS,
    FRAG_CORRELATION_BAR,
    HIDDEN_ALPHA,
    MINIMAP,
    MINIMAP_FALLBACK,
    MINIMAP_SIZES,
    MISSING_SIZE,
    RETICLE_CASSETTE,
    RETICLE_CONDITION,
    RETICLE_PARTS,
    RETICLE_RELOAD,
    RETICLE_RELOAD_TIMER,
    RETICLE_ZOOM,
    SIXTH_SENSE,
    STOCK_ALIASES,
)

__all__ = (
    'BATTLE_DAMAGE_LOG_PANEL',
    'BATTLE_TIMER',
    'CONSUMABLES_PANEL',
    'FOLLOWED_ALIASES',
    'FRAG_CORRELATION_BAR',
    'MINIMAP',
    'RETICLE_CASSETTE',
    'RETICLE_CONDITION',
    'RETICLE_PARTS',
    'RETICLE_RELOAD',
    'RETICLE_RELOAD_TIMER',
    'RETICLE_ZOOM',
    'SIXTH_SENSE',
    'STOCK_ALIASES',
    'StockSuppression',
    'bar_slots',
    'followed_metrics',
    'hide_reticle_parts',
    'stock_metrics',
)


def bar_slots(mask):
    """The slots the stock consumables panel shows from its `_mask` (one bit per added slot); None when unreadable."""
    if not is_number(mask) or mask <= 0:
        return None
    return bin(int(mask)).count('1')


def stock_metrics(minimap_index=None, slots=None):
    """`{bar, minimap}`: the stock consumables panel's width and the minimap's side in design px, the fallbacks for
    what could not be read."""
    readable = is_number(minimap_index)
    if readable and 0 <= int(minimap_index) < len(MINIMAP_SIZES):
        minimap = MINIMAP_SIZES[int(minimap_index)]
    else:
        minimap = MINIMAP_FALLBACK
    count = slots if is_number(slots) and slots > 0 else BAR_FALLBACK_SLOTS
    return {'bar': int(count) * BAR_PITCH, 'minimap': minimap}


def followed_metrics(metrics, hidden):
    """A copy of `metrics` (`stock_metrics`) with the size of every followed stock component the page hides now
    (`hidden`, aliases of FOLLOWED_ALIASES) at MISSING_SIZE: no attached panel keeps a place beside what is gone."""
    result = dict(metrics)
    for alias, key in FOLLOWED_METRICS:
        if alias in hidden:
            result[key] = MISSING_SIZE
    return result


def hide_reticle_parts(vo, parts):
    """A copy of the crosshair panel's settings `{view: {key: value}}` with each of `parts` it carries at opacity 0;
    `vo` itself when there is nothing to hide or it is not that shape."""
    hidden = frozenset(part for part in (parts or ()) if part in RETICLE_PARTS)
    if not hidden or not isinstance(vo, dict):
        return vo
    result = {}
    for view, values in vo.items():
        if isinstance(values, dict):
            values = dict(values)
            for part in hidden & frozenset(values):
                values[part] = HIDDEN_ALPHA
        result[view] = values
    return result


class StockSuppression(object):

    def __init__(self, known=STOCK_ALIASES):
        self.known = frozenset(known)
        self.owners = {}

    @property
    def aliases(self):
        return frozenset(alias for alias, owners in self.owners.items() if owners)

    def want(self, owner, aliases):
        wanted = frozenset(alias for alias in (aliases or ()) if alias in self.known)
        before = self.aliases

        for alias in list(self.owners):
            self.owners[alias].discard(owner)
            if not self.owners[alias]:
                del self.owners[alias]
        for alias in wanted:
            self.owners.setdefault(alias, set()).add(owner)

        after = self.aliases
        return after - before, before - after

    def filter(self, visible, hidden, aliases=None):
        suppressed = self.aliases if aliases is None else frozenset(aliases)
        visible = set(visible or ())
        hidden = set(hidden or ())
        blocked = visible & suppressed
        return visible - blocked, hidden | blocked
