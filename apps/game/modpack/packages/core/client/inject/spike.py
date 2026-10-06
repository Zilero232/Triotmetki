"""The dev-only inject spike: hud.html drawn inside the Scaleform hangar view with one label (spec, section "Spike").

It starts only in a dev install with OTMETKI_INJECT_SPIKE=1 or the flag file (core.inject.spike_enabled). The label
shows the input mode and a clock (the state path), the page's messages are logged (the command path), and Ctrl+Alt+I
cycles the input modes: `view` (the page takes the mouse only over its buttons, none here), `edit` (the page takes its
whole area, the label can be dragged), `locked` (edit, but the GFInjectComponent lets no mouse through to the page).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import datetime
import os

from ...hud.surface import SPACE_LOBBY, HudSurface
from ...inject import SpikeMode, spike_enabled, spike_text
from ...inject.constants import (
    SPIKE_ALIAS,
    SPIKE_FLAG,
    SPIKE_HOTKEY,
    SPIKE_LABEL,
    SPIKE_LABEL_PROPS,
    SPIKE_PAGE,
    SPIKE_TICK_S,
)
from ...lobby_view import HANGAR_ALIAS
from ...log import log, safe
from ..game import lobby_app
from ..hotkey import Hotkey
from ..timer import Ticker
from . import InjectHost

_started = []


class InjectSpike(object):

    def __init__(self):
        self.host = InjectHost(SPIKE_ALIAS, SPIKE_PAGE, self)
        self.surface = HudSurface()
        self.mode = SpikeMode()
        self.ticker = Ticker(SPIKE_TICK_S, self._tick)
        self.hotkey = Hotkey(SPIKE_HOTKEY[0], SPIKE_HOTKEY[1], self._next_mode)
        self.app = None

    def start(self):
        from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
        self.surface.create(SPIKE_LABEL, dict(SPIKE_LABEL_PROPS, text=self._text()), SPACE_LOBBY)
        g_eventBus.addListener(events.AppLifeCycleEvent.INITIALIZED, self._on_app_initialized, EVENT_BUS_SCOPE.GLOBAL)
        g_eventBus.addListener(events.AppLifeCycleEvent.DESTROYED, self._on_app_destroyed, EVENT_BUS_SCOPE.GLOBAL)
        self._watch(lobby_app())

    @safe
    def _on_app_initialized(self, event):
        from gui.app_loader.settings import APP_NAME_SPACE
        if event.ns == APP_NAME_SPACE.SF_LOBBY:
            self._watch(lobby_app())

    @safe
    def _on_app_destroyed(self, event):
        from gui.app_loader.settings import APP_NAME_SPACE
        if event.ns == APP_NAME_SPACE.SF_LOBBY:
            self._unwatch()

    def _watch(self, app):
        if app is None or app is self.app or getattr(app, 'loaderManager', None) is None:
            return
        self._unwatch()
        self.app = app
        app.loaderManager.onViewLoaded += self._on_view_loaded
        self.hotkey.install()
        log('inject spike: watching the lobby app for the hangar view')
        self._attach_existing(app)

    def _unwatch(self):
        app, self.app = self.app, None
        if app is not None and getattr(app, 'loaderManager', None) is not None:
            app.loaderManager.onViewLoaded -= self._on_view_loaded
        self.host.detach()

    def _attach_existing(self, app):
        from gui.Scaleform.framework.entities.View import ViewKey
        container = app.containerManager
        key = ViewKey(HANGAR_ALIAS)
        if container is not None and container.isViewCreated(key):
            self.host.attach(container.getViewByKey(key))

    @safe
    def _on_view_loaded(self, view, *args, **kwargs):
        if getattr(view, 'alias', None) == HANGAR_ALIAS:
            log('inject spike: hangar view loaded')
            self.host.attach(view)

    def on_page(self, view):
        self._apply_mode()
        self.ticker.start()

    def on_gone(self):
        self.ticker.stop()
        log('inject spike: the page is gone (hangar left or destroyed)')

    def on_message(self, raw):
        log('inject spike: page says %s' % (raw if raw is None else raw[:200]))
        self.surface.handle(raw)
        self._push()

    def _tick(self):
        self.surface.update(SPIKE_LABEL, {'text': self._text()})
        self._push()
        return self.host.attached()

    def _text(self):
        return spike_text(self.mode.name, datetime.datetime.now())

    def _push(self):
        self.host.push(self.surface.encode(SPACE_LOBBY, True, self.mode.edit))

    @safe
    def _next_mode(self):
        self.mode = self.mode.next()
        self._apply_mode()

    def _apply_mode(self):
        self.host.set_mouse(self.mode.mouse)
        self.surface.update(SPIKE_LABEL, {'text': self._text()})
        self._push()
        mode = self.mode
        log('inject spike: mode %s (page edit %s, Scaleform mouse %s)' % (mode.name, mode.edit, mode.mouse))


def start(dev):
    """Start the spike once, when `dev` (a dev install) and OTMETKI_INJECT_SPIKE=1 or the flag file ask for it."""
    if _started or not spike_enabled(os.environ, os.path.isfile(SPIKE_FLAG), dev):
        return False
    spike = InjectSpike()
    spike.start()
    _started.append(spike)
    log('inject spike: on (%s)' % SPIKE_FLAG)
    return True
