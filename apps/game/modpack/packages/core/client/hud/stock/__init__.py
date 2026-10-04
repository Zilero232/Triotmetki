"""Hides the stock battle HUD elements our Gameface panels replace, and follows the stock GUI toggles.

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

One cover rule (`HudLayer.set_cover`): `GameEvent.GUI_VISIBILITY` (V) hides our battle panels with the stock GUI, and so
do the post-mortem camera on the killer (`inputHandler.onPostmortemKillerVisionEnter` / `Exit`) and the battle loading
screen with the team lists (`GameEvent.BATTLE_LOADING`); `GameEvent.FULL_STATS` (Tab) keeps them and has the page fade
them under the full stats backdrop, and a modal stock view (the Esc menu, the F1 help: `modal.ModalWatch`) has it fade
every panel; while either is up the panels take no mouse and show no tooltip. The panels are never recreated, so nothing
jumps when the view comes back.
`GameEvent.SHOW_EXTENDED_INFO` (Alt held, the key the stock markers, players panel and damage log expand on) goes out as
`battle_extended_info(held)` on the app bus for the panels with an alternate mode.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from functools import partial

from ....hooks import Subscriptions, override
from ....hud.layer.constants import COVER_KILLCAM, COVER_LOADING
from ....hud.stock import STOCK_ALIASES, StockSuppression
from ....log import log, log_exception, safe
from .constants import (
    EXTENDED_INFO_DOWN,
    EXTENDED_INFO_EVENT,
    FULL_STATS_DOWN,
    GUI_VISIBLE,
    KILLER_VISION_EVENTS,
    LOADING_SHOWN,
)
from .modal import ModalWatch

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
        self.gui_visible = True
        self.full_stats = False
        self.killcam = False
        self.loading = False
        self.killer_hooks = Subscriptions()
        self.extended = False
        self.hidden = frozenset()
        self.modal = ModalWatch(self._on_modal)

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
        return True

    def attach(self, page):
        if SharedPage is None or not isinstance(page, SharedPage):
            return
        self.page = page
        self.hidden = frozenset()
        self.gui_visible = True
        self.full_stats = False
        self.killcam = False
        self._follow_killer()
        self.modal.attach(page)
        self._follow()
        self._set_extended(False)
        self.sync()

    def detach(self, page):
        if page is self.page:
            self.page = None
            self.hidden = frozenset()
            self.killer_hooks.clear()
            self.modal.detach()
            self.killcam = False
            self.loading = False
            self._follow()
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
        self.suppression.want(owner, aliases)
        self.sync(owner)

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
        game_event = getattr(events, 'GameEvent', None)
        handlers = (
            ('GUI_VISIBILITY', self._on_gui_visibility),
            ('FULL_STATS', self._on_full_stats),
            ('BATTLE_LOADING', self._on_loading),
            ('SHOW_EXTENDED_INFO', self._on_extended_info),
        )
        for name, handler in handlers:
            event = getattr(game_event, name, None)
            if event is not None:
                g_eventBus.addListener(event, handler, EVENT_BUS_SCOPE.BATTLE)

    @safe
    def _on_gui_visibility(self, event):
        self.gui_visible = _event_flag(event, GUI_VISIBLE, True)
        self._follow()

    @safe
    def _on_full_stats(self, event):
        self.full_stats = _event_flag(event, FULL_STATS_DOWN, False)
        self._follow()

    @safe
    def _on_loading(self, event):
        self.loading = _event_flag(event, LOADING_SHOWN, False)
        self._follow()

    def _follow_killer(self):
        self.killer_hooks.clear()
        handler = getattr(_player(), 'inputHandler', None)
        for name, shown in KILLER_VISION_EVENTS:
            if getattr(handler, name, None) is not None:
                self.killer_hooks.add(handler, name, partial(self._on_killer_vision, shown))

    def _on_modal(self, shown):
        self._follow()

    def _on_killer_vision(self, shown, *args):
        self.killcam = shown
        self._follow()

    @safe
    def _on_extended_info(self, event):
        self._set_extended(_event_flag(event, EXTENDED_INFO_DOWN, False))

    def _set_extended(self, held):
        if held != self.extended:
            self.extended = held
            self.bus.emit(EXTENDED_INFO_EVENT, held)

    def _follow(self):
        on_page = self.page is not None
        self.layer.set_gui_hidden(on_page and not self.gui_visible)
        self.layer.set_full_stats(on_page and self.full_stats)
        self.layer.set_menu(on_page and self.modal.shown)
        self.layer.set_cover(COVER_KILLCAM, on_page and self.killcam)
        self.layer.set_cover(COVER_LOADING, on_page and self.loading)


def _player():
    try:
        import BigWorld
        return BigWorld.player()
    except Exception:  # no avatar outside a battle (or no client in the checks)
        return None


def _event_flag(event, key, default):
    context = getattr(event, 'ctx', None) or {}
    return bool(context.get(key, default))
