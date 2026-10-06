"""The client side of `core.lobby_view`: watches the wulf windows manager and tells its listeners whether the plain
hangar view is on the screen (`listen(callback)` gets `callback(visible)` now and on every change).

RU 1.45 client source: `IGuiLoader.windowsManager.onWindowStatusChanged(uniqueID, status)` fires for every window
(Scaleform views sit in an `SFWindow` whose `loadParams.viewKey.alias` names them, Gameface ones carry their `layer`);
`findWindows(predicate)` lists them. A window whose class comes from our own packages (`gui.mods.otmetki.*`) is ours.
Without the windows manager the labels stay visible (the rule fails open).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...events import Listeners
from ...log import log, safe
from ...lobby_view import BLOCKING_LAYERS, GONE_STATUSES, HANGAR_ALIAS, HIDDEN_LAYERS, plain_hangar
from ..game import service

OWN_MODULES = __name__.rsplit('.core.', 1)[0] + '.'


def _names(holder, names):
    return set(value for value in (getattr(holder, name, None) for name in names) if value is not None)


def _alias(window):
    params = getattr(window, 'loadParams', None)
    key = getattr(params, 'viewKey', None)
    alias = getattr(key, 'alias', None)
    if alias is None:
        alias = getattr(getattr(window, 'content', None), 'alias', None)
    return alias


class LobbyViewWatch(object):

    def __init__(self):
        self.listeners = Listeners('lobby view listener')
        self.visible = True
        self.manager = None
        self.logged = False
        self.blocking = set()
        self.gone = set()
        self.popover = None

    @safe
    def install(self):
        if self.manager is not None:
            return True
        try:
            from frameworks.wulf import WindowLayer, WindowStatus
            from skeletons.gui.impl import IGuiLoader
            self.manager = service(IGuiLoader).windowsManager
        except Exception:
            if not self.logged:
                self.logged = True
                log('lobby view: no wulf windows manager yet, hangar labels stay on until it is there')
            self.manager = None
            return False
        self.blocking = _names(WindowLayer, BLOCKING_LAYERS)
        self.gone = _names(WindowStatus, GONE_STATUSES)
        try:
            from gui.impl.pub.pop_over_window import PopOverWindow
            self.popover = PopOverWindow
        except Exception:
            self.popover = None
        self.manager.onWindowStatusChanged += self._on_status
        self.check()
        return True

    def listen(self, callback):
        self.listeners.add(callback)
        self.install()
        callback(self.visible)

    def describe(self, window):
        popover = self.popover is not None and isinstance(window, self.popover)
        return {
            'blocking': getattr(window, 'layer', None) in self.blocking and not popover,
            'hangar': _alias(window) == HANGAR_ALIAS,
            'alive': getattr(window, 'windowStatus', None) not in self.gone,
            'own': type(window).__module__.startswith(OWN_MODULES),
        }

    @safe
    def _on_status(self, unique_id, status):
        self.check()
        try:
            import BigWorld
            BigWorld.callback(0, self.check)
        except Exception:
            pass

    @safe
    def check(self):
        if self.manager is None:
            return
        windows = self.manager.findWindows(lambda window: True) or []
        visible = plain_hangar([self.describe(window) for window in windows])
        if visible == self.visible:
            return
        self.visible = visible
        self.listeners.notify(visible)


def hidden_layers():
    """The wulf layers the client's overlay controller hides to show the bare hangar."""
    from frameworks.wulf import WindowLayer
    return tuple(getattr(WindowLayer, name) for name in HIDDEN_LAYERS if hasattr(WindowLayer, name))


_state = {'watch': None}


def lobby_view():
    """The process-wide watch (created on first use)."""
    if _state['watch'] is None:
        _state['watch'] = LobbyViewWatch()
    return _state['watch']
