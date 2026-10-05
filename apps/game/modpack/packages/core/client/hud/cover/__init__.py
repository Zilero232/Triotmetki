"""The one "battle covered" state: our panels hide whenever the stock battle page hides its HUD under an overlay or a
stock screen replaces the battle view, and come back when it closes (docs/research/client/2026-10-05-battle-overlays.md
lists each overlay).

Sources (`core.hud.cover.CoverState`, a reason stays on while any source reports it):
- V: `GameEvent.GUI_VISIBILITY` and the page's `isGuiVisible()`;
- the post-mortem camera on the killer (`inputHandler.onPostmortemKillerVisionEnter` / `Exit`);
- the battle loading screen with the team lists (`GameEvent.BATTLE_LOADING`);
- the battle page: RU 1.45 client source gui/Scaleform/daapi/view/battle/shared/page.py,
  `SharedPage._setComponentsVisibility(visible, hidden)` is how every battle page (random, ranked, Onslaught, Frontline,
  Steel Hunter, story mode, the event pages, replays) hides its HUD under the full stats on any tab (Tab, the personal
  missions and personal reserves keys), the event stats and the loading screen, and shows its respawn screens and the
  Frontline overview map. We wrap it (the original always runs); `core.hud.cover.PageOverlays` mirrors the page's
  reference component, as XVM mirrors `teamBasesPanel`, and the covering components. The keys (`OVERLAY_EVENTS`) only
  have the page checked again a frame later: `_toggleFullStats` returns early with a modal view or the radial menu open,
  so a key press alone never hides anything;
- the full-screen Gameface windows (`windows.WindowWatch`).

The Esc menu, the F1 help, the settings and dialogs are left alone: they draw over the battle page and, by their layer,
over the HUD window, and the stock HUD, Battle Observer and XVM stay drawn under them.

Every battle page starts with nothing covered but the loading screen (it opens before the page) and ends with nothing
covered. While anything is covered the watch checks the client again every `CHECK_INTERVAL_S` (the page's visible
components, the open windows, whether the page was disposed), so a close event that never came cannot keep the panels
hidden. A failing update uncovers every panel. The companion switch "hide panels under game windows"
(`HIDE_UNDER_WINDOWS_KEY`, read on every update) leaves only V, the killer camera and the loading screen.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from functools import partial

import BigWorld

from ....hooks import Subscriptions, override
from ....hud.cover import CHECK_INTERVAL_S, REASONS, CoverState, PageOverlays
from ....hud.cover.constants import SOURCE_GUI, SOURCE_KILLCAM, SOURCE_LOADING, SOURCE_PAGE, SOURCE_WINDOWS
from ....hud.layer.constants import COVER_GUI, COVER_KILLCAM, COVER_LOADING
from ....log import log, log_exception, safe
from ...timer import Ticker
from .constants import GUI_VISIBLE, KILLER_VISION_EVENTS, LOADING_SHOWN, OVERLAY_EVENTS
from .windows import WindowWatch

try:
    from gui.Scaleform.daapi.view.battle.shared.page import SharedPage
    IMPORT_ERROR = None
except Exception as error:  # the battle page moved: nothing covers the panels
    SharedPage = None
    IMPORT_ERROR = error


class CoverWatch(object):

    def __init__(self, layer, windows_switch=None):
        self.layer = layer
        self.windows_switch = windows_switch
        self.state = CoverState()
        self.page = None
        self.overlays = PageOverlays()
        self.installed = False
        self.killer_hooks = Subscriptions()
        self.windows = WindowWatch(self._on_windows)
        self.ticker = Ticker(CHECK_INTERVAL_S, self._on_tick)

    @safe
    def install(self):
        if self.installed:
            return True
        self.installed = True
        if IMPORT_ERROR is not None:
            log('HUD cover: panels are not covered by stock overlays (battle page: %s)' % IMPORT_ERROR)
            return False
        watch = self

        @override(SharedPage, '_setComponentsVisibility')
        def _set_components_visibility(original, page, visible=None, hidden=None):
            shown, gone = _names(visible), _names(hidden)
            result = original(page, visible, hidden)
            if page is watch.page:
                watch.page_changed(shown, gone)
            return result

        @override(SharedPage, '_populate')
        def _populate(original, page, *args, **kwargs):
            result = original(page, *args, **kwargs)
            watch.attach(page)
            return result

        @override(SharedPage, '_dispose')
        def _dispose(original, page, *args, **kwargs):
            watch.detach(page)
            return original(page, *args, **kwargs)

        self._listen_events()
        return True

    def attach(self, page):
        if SharedPage is None or not isinstance(page, SharedPage):
            return
        self.detach(self.page)
        self.page = page
        self.overlays = PageOverlays(getattr(page, '_fullStatsAlias', None))
        self.state.reset(keep=(SOURCE_LOADING,))
        self._follow_killer()
        self.windows.start()
        self.state.report(SOURCE_WINDOWS, self.windows.reasons)
        self.apply()

    def detach(self, page):
        if page is None or page is not self.page:
            return
        self.page = None
        self.killer_hooks.clear()
        self.windows.stop()
        self.state.reset()
        self.ticker.stop()
        self.apply()

    def page_changed(self, visible, hidden):
        if self.overlays.changed(visible, hidden):
            self.state.report(SOURCE_PAGE, self.overlays.reasons())
            self.apply()

    def windows_on(self):
        switch = self.windows_switch
        return True if switch is None else switch() is not False

    def apply(self):
        try:
            wanted = self.state.reasons(windows=self.windows_on()) if self.page is not None else frozenset()
            for reason in REASONS:
                self.layer.set_cover(reason, reason in wanted)
        except Exception:
            log_exception('HUD cover: panels uncovered')
            self._uncover()
            return
        if self.state.covered:
            self.ticker.start()

    @safe
    def check(self):
        """Ask the client again for everything it can answer now: the page's visible components, the Gameface windows,
        V, and whether the page is still alive."""
        page = self.page
        if page is None:
            return
        if _disposed(page):
            self.detach(page)
            return
        self.overlays.snapshot(_page_call(page, 'as_getComponentsVisibilityS'))
        self.state.report(SOURCE_PAGE, self.overlays.reasons())
        self.windows.check()
        self.state.report(SOURCE_WINDOWS, self.windows.reasons)
        visible = _page_call(page, 'isGuiVisible')
        if isinstance(visible, bool):
            self.state.report(SOURCE_GUI, () if visible else (COVER_GUI,))
        self.apply()

    def _on_tick(self):
        self.check()
        return self.state.covered

    def _uncover(self):
        for reason in REASONS:
            try:
                self.layer.set_cover(reason, False)
            except Exception:
                log_exception('HUD cover: uncover %s' % reason)

    def _on_windows(self):
        self.state.report(SOURCE_WINDOWS, self.windows.reasons)
        self.apply()

    def _listen_events(self):
        try:
            from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
        except ImportError:
            return
        game_event = getattr(events, 'GameEvent', None)
        handlers = [('GUI_VISIBILITY', self._on_gui_visibility), ('BATTLE_LOADING', self._on_loading)]
        handlers += [(name, self._on_overlay_key) for name in OVERLAY_EVENTS]
        for name, handler in handlers:
            event = getattr(game_event, name, None)
            if event is not None:
                g_eventBus.addListener(event, handler, EVENT_BUS_SCOPE.BATTLE)

    @safe
    def _on_gui_visibility(self, event):
        visible = _event_flag(event, GUI_VISIBLE, True)
        self.state.report(SOURCE_GUI, () if visible else (COVER_GUI,))
        self.apply()

    @safe
    def _on_loading(self, event):
        shown = _event_flag(event, LOADING_SHOWN, False)
        self.state.report(SOURCE_LOADING, (COVER_LOADING,) if shown else ())
        self.apply()

    @safe
    def _on_overlay_key(self, event):
        BigWorld.callback(0, self.check)

    def _follow_killer(self):
        self.killer_hooks.clear()
        handler = getattr(_player(), 'inputHandler', None)
        for name, shown in KILLER_VISION_EVENTS:
            if getattr(handler, name, None) is not None:
                self.killer_hooks.add(handler, name, partial(self._on_killer_vision, shown))

    def _on_killer_vision(self, shown, *args):
        self.state.report(SOURCE_KILLCAM, (COVER_KILLCAM,) if shown else ())
        self.apply()


def _names(aliases):
    try:
        return frozenset(aliases or ())
    except TypeError:
        return frozenset()


def _page_call(page, name):
    method = getattr(page, name, None)
    if method is None:
        return None
    try:
        return method()
    except Exception:  # the page's Flash object is gone
        return None


def _disposed(page):
    return _page_call(page, 'isDisposed') is True


def _player():
    try:
        return BigWorld.player()
    except Exception:  # no avatar outside a battle (or no client in the checks)
        return None


def _event_flag(event, key, default):
    context = getattr(event, 'ctx', None) or {}
    return bool(context.get(key, default))
