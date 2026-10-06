"""Hides the parts of the stock reticle our crosshair readouts draw (`core.hud.stock.RETICLE_PARTS`).

RU 1.45 client source (gui/Scaleform/daapi/view/battle/shared/crosshair): `SettingsPlugin` builds the reticle settings
from the player's saved options (`plugins._makeSettingsVO`) and hands them to `CrosshairPanelContainer.setSettings`,
again on every settings change. We wrap that call: the original always runs, with the parts we replace at opacity 0;
the saved options are never written. The last settings the panel got are kept, so a part we give back is shown again
at once with the player's own opacity. A failure in the wrapper hands the panel the untouched settings (core.hooks).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....hooks import override
from ....hud.stock import (
    AUTOLOADER_PERCENT_TIMER,
    AUTOLOADER_UPDATE_TIMER,
    RETICLE_PARTS,
    RETICLE_RELOAD_TIMER,
    StockSuppression,
    hide_reticle_parts,
    without_timer,
)
from ....log import guarded, log, log_exception, safe

try:
    from gui.Scaleform.daapi.view.battle.shared.crosshair.container import CrosshairPanelContainer
    IMPORT_ERROR = None
except Exception as error:  # the crosshair panel moved: the stock reticle stays whole
    CrosshairPanelContainer = None
    IMPORT_ERROR = error


class ReticleControl(object):

    def __init__(self):
        self.suppression = StockSuppression(RETICLE_PARTS)
        self.panel = None
        self.settings = None
        self.hidden = frozenset()
        self.installed = False

    @safe
    def install(self):
        if self.installed:
            return
        self.installed = True
        if IMPORT_ERROR is not None:
            log('HUD: the stock reticle stays whole (crosshair panel: %s)' % IMPORT_ERROR)
            return
        control = self

        @override(CrosshairPanelContainer, 'setSettings')
        def _set_settings(original, panel, vo):
            control.panel = panel
            control.settings = vo
            return original(panel, hide_reticle_parts(vo, control.hidden))

        # RU 1.45 crosshair/plugins.py AmmoPlugin: an autoloading clip (the Gendarme) draws its own countdown through
        # these two calls, which the settings' opacity does not reach; the shell count stays.
        @override(CrosshairPanelContainer, 'as_autoloaderUpdateS')
        def _autoloader_update(original, panel, *args, **kwargs):
            if control.hides_timer():
                args, kwargs = without_timer(args, kwargs, AUTOLOADER_UPDATE_TIMER)
            return original(panel, *args, **kwargs)

        @override(CrosshairPanelContainer, 'as_setAutoloaderPercentS')
        def _autoloader_percent(original, panel, *args, **kwargs):
            if control.hides_timer():
                args, kwargs = without_timer(args, kwargs, AUTOLOADER_PERCENT_TIMER)
            return original(panel, *args, **kwargs)

        @override(CrosshairPanelContainer, '_dispose')
        def _dispose(original, panel, *args, **kwargs):
            if panel is control.panel:
                control.panel = None
                control.settings = None
            return original(panel, *args, **kwargs)

    def hides_timer(self):
        return RETICLE_RELOAD_TIMER in self.hidden

    def want(self, owner, parts):
        self.install()
        self.suppression.want(owner, parts)
        self.sync(owner)

    def sync(self, owner=None):
        target = self.suppression.aliases
        if target == self.hidden:
            return
        hidden, released = target - self.hidden, self.hidden - target
        self.hidden = target
        self._push()
        log('HUD: stock reticle %s hidden, %s restored (%s)' % (
            sorted(hidden) or '-', sorted(released) or '-', owner or 'the battle'))

    def reset(self):
        self.suppression = StockSuppression(RETICLE_PARTS)
        self.sync('the battle page left')

    def _push(self):
        panel, settings = self.panel, self.settings
        if panel is None or settings is None:
            return
        try:
            panel.as_setSettingsS(hide_reticle_parts(settings, self.hidden))
        except Exception:
            log_exception('HUD: stock reticle settings')
            self._restore(panel, settings)

    @staticmethod
    @guarded('HUD: restore the stock reticle')
    def _restore(panel, settings):
        panel.as_setSettingsS(settings)

