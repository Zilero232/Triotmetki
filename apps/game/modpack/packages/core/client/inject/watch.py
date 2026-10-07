from __future__ import absolute_import, division, print_function, unicode_literals

from ...log import log, safe


class ViewWatch(object):
    """Calls `on_view(view)` for every Scaleform view named in `aliases` that the app of the `namespace` (an
    APP_NAME_SPACE name: SF_LOBBY, SF_BATTLE) loads, and for one already loaded when the watch starts or the app is
    created again; `on_app_gone()` when that app is destroyed. `get_app()` returns the app (None while there is
    none). `start()` / `stop()` are idempotent; `start()` is falsy when the client lacks the app events."""

    def __init__(self, namespace, aliases, get_app, on_view, on_app_gone):
        self.namespace = namespace
        self.aliases = tuple(aliases)
        self.get_app = get_app
        self.on_view = on_view
        self.on_app_gone = on_app_gone
        self.app = None
        self.started = False

    @safe
    def start(self):
        if self.started:
            return True
        from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
        lifecycle = events.AppLifeCycleEvent
        g_eventBus.addListener(lifecycle.INITIALIZED, self._on_app_initialized, EVENT_BUS_SCOPE.GLOBAL)
        g_eventBus.addListener(lifecycle.DESTROYED, self._on_app_destroyed, EVENT_BUS_SCOPE.GLOBAL)
        self.started = True
        self._watch(self.get_app())
        return True

    @safe
    def stop(self):
        if not self.started:
            return
        from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
        lifecycle = events.AppLifeCycleEvent
        g_eventBus.removeListener(lifecycle.INITIALIZED, self._on_app_initialized, EVENT_BUS_SCOPE.GLOBAL)
        g_eventBus.removeListener(lifecycle.DESTROYED, self._on_app_destroyed, EVENT_BUS_SCOPE.GLOBAL)
        self.started = False
        self._unwatch()

    def _ours(self, event):
        from gui.app_loader.settings import APP_NAME_SPACE
        return getattr(event, 'ns', None) == getattr(APP_NAME_SPACE, self.namespace, None)

    @safe
    def _on_app_initialized(self, event):
        if self._ours(event):
            self._watch(self.get_app())

    @safe
    def _on_app_destroyed(self, event):
        if self._ours(event):
            self._unwatch()

    def _watch(self, app):
        if app is None or app is self.app or getattr(app, 'loaderManager', None) is None:
            return
        self._unwatch()
        self.app = app
        app.loaderManager.onViewLoaded += self._on_view_loaded
        log('inject: watching the %s app for %s' % (self.namespace, ', '.join(self.aliases)))
        self._existing(app)

    def _unwatch(self):
        app, self.app = self.app, None
        if app is None:
            return
        if getattr(app, 'loaderManager', None) is not None:
            app.loaderManager.onViewLoaded -= self._on_view_loaded
        self.on_app_gone()

    def _existing(self, app):
        from gui.Scaleform.framework.entities.View import ViewKey
        container = getattr(app, 'containerManager', None)
        if container is None:
            return
        for alias in self.aliases:
            key = ViewKey(alias)
            if container.isViewCreated(key):
                self.on_view(container.getViewByKey(key))
                return

    @safe
    def _on_view_loaded(self, view, *args, **kwargs):
        if getattr(view, 'alias', None) in self.aliases:
            self.on_view(view)
