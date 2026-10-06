"""The Gameface (wulf) windows open over the battle: a full-screen one replaces the battle view
(`core.hud.cover.window_reason`).

RU 1.45 client source: `IGuiLoader.windowsManager.onWindowStatusChanged(uniqueID, status)` fires for every window and
`findWindows(predicate)` lists them (frameworks/wulf/windows_system/windows_manager.py); `Window.windowFlags` holds the
type and the WINDOW_FULLSCREEN state (window.py). In battle the full-screen ones are the story mode's prebattle,
epilogue and result windows and the Cosmic event help (WINDOW | WINDOW_FULLSCREEN). Dialogs and the pop-overs of the
prebattle ammunition panel and the Onslaught skills never cover; Scaleform views (an SFWindow, it has `loadParams`) are
the battle page's business. Our own windows (the HUD page, the settings window with its HUD editor) never cover. Every
change rescans every window, so a status the watch missed is put right by the next one; without the windows manager
nothing is reported (the panels stay).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....hud.cover import window_reason
from ....log import log, safe
from ...game import service
from ...lobby_view import OWN_MODULES
from .constants import GONE_STATUSES


def _hidden(window):
    is_hidden = getattr(window, 'isHidden', None)
    try:
        return bool(is_hidden()) if is_hidden is not None else False
    except Exception:  # a window without its C++ proxy any more
        return False


class WindowWatch(object):

    def __init__(self, on_change):
        self.on_change = on_change
        self.manager = None
        self.gone = set()
        self.reasons = frozenset()

    @safe
    def start(self):
        if self.manager is not None:
            return True
        try:
            from frameworks.wulf import WindowStatus
            from skeletons.gui.impl import IGuiLoader
            manager = service(IGuiLoader).windowsManager
        except Exception as error:
            log('HUD cover: no wulf windows manager (%s), Gameface windows do not cover the panels' % error)
            return False
        self.gone = set(getattr(WindowStatus, name, None) for name in GONE_STATUSES)
        manager.onWindowStatusChanged += self._on_status
        self.manager = manager
        self.check()
        return True

    def stop(self):
        manager = self.manager
        self.manager = None
        if manager is not None:
            manager.onWindowStatusChanged -= self._on_status
        self.reasons = frozenset()

    def describe(self, window):
        return {
            'alive': getattr(window, 'windowStatus', None) not in self.gone,
            'own': type(window).__module__.startswith(OWN_MODULES),
            'scaleform': hasattr(window, 'loadParams'),
            'hidden': _hidden(window),
            'flags': getattr(window, 'windowFlags', 0),
        }

    def check(self):
        """Rescan every window; returns whether the reasons changed."""
        if self.manager is None:
            return False
        windows = self.manager.findWindows(lambda window: True) or []
        reasons = frozenset(reason for reason in (window_reason(self.describe(window)) for window in windows) if reason)
        if reasons == self.reasons:
            return False
        self.reasons = reasons
        return True

    @safe
    def _on_status(self, unique_id, status):
        if self.check():
            self.on_change()
