"""Hides the stock battle HUD elements our Gameface panels replace, and follows Alt (the stock extended info).

RU 1.45 client source (gui/Scaleform/daapi/view/battle/shared/page.py): `SharedPage._setComponentsVisibility(visible,
hidden)` is how the battle page shows and hides its components, again and again (control mode, full stats, postmortem),
so a one-off hide gets undone. We wrap it: the original always runs, with our suppressed aliases moved from `visible` to
`hidden` (`core.hud.stock`). Every battle page (every `SharedPage`: random, ranked, training, Onslaught, Frontline, the
event pages such as Waffentrager (white_tiger WTBattlePage.as registers battleDamageLogPanel too), story mode, Steel
Hunter, replays) is treated the same way: what decides is whether the page has the element, looked up by its alias in
`page.components` (the DAAPI components the page registered; `_onRegisterFlashComponent` re-checks as they arrive),
never the battle type. Until the page registered any, an alias is taken as present. An alias we gave back is shown again
at once (`as_setComponentsVisibilityS`), or handed to the page's full-stats set while Tab is open so it comes back with
the rest. `summary()` is the battle page and the aliases found and hidden, for the battle's HUD report.

A panel's `stock_aliases()` may also name parts of the stock reticle (`core.hud.stock.RETICLE_PARTS`): those go to
`reticle.ReticleControl`, which hands the crosshair panel its settings with the parts at opacity 0 while they are
wanted; leaving the battle page gives every part back.

What covers the battle view (V, the loading screen, Tab and every other stock overlay) is `core.client.hud.cover`.
The suppression follows the layer (`HudLayer.watch`, `releases_stock`): while a panel is muted (streamer mode), blocked,
left out of the battle type or hidden by a reason the stock HUD does not share (the killer camera), the stock elements
it replaces come back, so the player never sees neither.
`GameEvent.SHOW_EXTENDED_INFO` (Alt held, the key the stock markers, players panel and damage log expand on) goes out as
`battle_extended_info(held)` on the app bus for the panels with an alternate mode.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....hooks import override
from ....hud.stock import RETICLE_PARTS, STOCK_ALIASES, StockSuppression
from ....log import log, log_exception, safe
from .constants import EXTENDED_INFO_DOWN, EXTENDED_INFO_EVENT
from .metrics import StockMetrics
from .reticle import ReticleControl

try:
    from gui.Scaleform.daapi.view.battle.shared.page import SharedPage
    IMPORT_ERROR = None
except Exception as error:  # the battle page moved: every stock element stays
    SharedPage = None
    IMPORT_ERROR = error


class StockControl(object):

    def __init__(self, layer, bus):
        self.layer = layer
        self.bus = bus
        self.suppression = StockSuppression()
        self.page = None
        self.installed = False
        self.extended = False
        self.hidden = frozenset()
        self.metrics = StockMetrics(layer)
        self.reticle = ReticleControl()
        self.requested = {}
        watch = getattr(layer, 'watch', None)
        if watch is not None:
            watch(self.follow_layer)

    @safe
    def install(self):
        if self.installed:
            return True
        self.installed = True
        if IMPORT_ERROR is not None:
            log('HUD: stock panels stay (battle page: %s)' % IMPORT_ERROR)
            return False
        control = self

        @override(SharedPage, '_setComponentsVisibility')
        def _set_components_visibility(original, page, visible=None, hidden=None):
            if page is control.page and control.hidden:
                visible, hidden = control.suppression.filter(visible, hidden, control.hidden)
            return original(page, visible, hidden)

        @override(SharedPage, '_populate')
        def _populate(original, page, *args, **kwargs):
            result = original(page, *args, **kwargs)
            control.attach(page)
            return result

        @override(SharedPage, '_dispose')
        def _dispose(original, page, *args, **kwargs):
            control.detach(page)
            return original(page, *args, **kwargs)

        if hasattr(SharedPage, '_onRegisterFlashComponent'):
            @override(SharedPage, '_onRegisterFlashComponent')
            def _on_register(original, page, view, alias, *args, **kwargs):
                result = original(page, view, alias, *args, **kwargs)
                if page is control.page and alias in STOCK_ALIASES:
                    control.sync('the page registered %s' % alias)
                return result

        self._listen_gui()
        self.metrics.install()
        self.reticle.install()
        return True

    def attach(self, page):
        if SharedPage is None or not isinstance(page, SharedPage):
            return
        self.page = page
        self.hidden = frozenset()
        self._set_extended(False)
        self.metrics.measure_page(page)
        self.sync()

    def detach(self, page):
        if page is self.page:
            self.page = None
            self.hidden = frozenset()
            self.reticle.reset()
            self._set_extended(False)

    def present(self, alias):
        components = getattr(self.page, 'components', None)
        if not isinstance(components, dict) or not components:
            return True
        return alias in components

    def in_force(self):
        if self.page is None:
            return frozenset()
        return frozenset(alias for alias in self.suppression.aliases if self.present(alias))

    def found(self):
        """The stock aliases we may replace that the battle page has registered."""
        components = getattr(self.page, 'components', None)
        if not isinstance(components, dict):
            return frozenset()
        return frozenset(alias for alias in STOCK_ALIASES if alias in components)

    def summary(self):
        """The battle page (its alias or class) and the stock aliases it has and we hide, or None off the page."""
        page = self.page
        if page is None:
            return None
        name = getattr(page, 'alias', None) or type(page).__name__
        return {'page': name, 'found': sorted(self.found()), 'hidden': sorted(self.hidden)}

    def want(self, owner, aliases):
        self.install()
        self.requested[owner] = tuple(aliases or ())
        self._apply_want(owner)
        self.sync(owner)

    @safe
    def follow_layer(self):
        """The layer changed what keeps panels off the screen: a panel muted, blocked or hidden by a reason the stock
        HUD does not share gives its stock elements back, and takes them again when it is back."""
        for owner in list(self.requested):
            self._apply_want(owner)
        self.sync('the panels shown or held')

    def _apply_want(self, owner):
        releases = getattr(self.layer, 'releases_stock', None)
        released = releases is not None and releases(owner)
        aliases = () if released else self.requested.get(owner, ())
        self.suppression.want(owner, aliases)
        self.reticle.want(owner, tuple(alias for alias in aliases if alias in RETICLE_PARTS))

    def sync(self, owner=None):
        target = self.in_force()
        hidden = target - self.hidden
        released = self.hidden - target
        self.hidden = target
        self._hide(hidden)
        self._show(frozenset(alias for alias in released if self.present(alias)))
        if hidden or released:
            reason = owner or 'the battle page'
            log('HUD: stock %s hidden, %s restored (%s)' % (sorted(hidden) or '-', sorted(released) or '-', reason))

    def _hide(self, aliases):
        page = self.page
        if page is None or not aliases:
            return
        try:
            page.as_setComponentsVisibilityS(set(), set(aliases))
        except Exception:
            log_exception('HUD: hide stock %s' % sorted(aliases))

    def _show(self, aliases):
        page = self.page
        if page is None or not aliases:
            return
        toggling = getattr(page, '_fsToggling', None)
        if toggling:
            toggling.update(aliases)
            return
        try:
            page.as_setComponentsVisibilityS(set(aliases), set())
        except Exception:
            log_exception('HUD: restore stock %s' % sorted(aliases))

    def _listen_gui(self):
        try:
            from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
        except ImportError:
            return
        event = getattr(getattr(events, 'GameEvent', None), 'SHOW_EXTENDED_INFO', None)
        if event is not None:
            g_eventBus.addListener(event, self._on_extended_info, EVENT_BUS_SCOPE.BATTLE)

    @safe
    def _on_extended_info(self, event):
        self._set_extended(_event_flag(event, EXTENDED_INFO_DOWN, False))

    def _set_extended(self, held):
        if held != self.extended:
            self.extended = held
            self.bus.emit(EXTENDED_INFO_EVENT, held)


def _event_flag(event, key, default):
    context = getattr(event, 'ctx', None) or {}
    return bool(context.get(key, default))
