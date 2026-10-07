from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.hooks import override
from ....core.log import log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import has_body, shell_lines, shell_stats, with_lines
from ..settings import SCHEMA, SWITCH
from .constants import SHELL_TOOLTIP_METHOD, TRACK_METHOD

try:
    from gui.Scaleform.daapi.view.battle.shared.crosshair.plugins import TargetDistancePlugin
except Exception:
    TargetDistancePlugin = None

try:
    from gui.Scaleform.daapi.view.battle.shared.consumables_panel import ConsumablesPanel
except Exception:
    ConsumablesPanel = None


def _speed_factor():
    try:
        from items import vehicles
        return vehicles.g_cache.commonConfig['miscParams']['projectileSpeedFactor']
    except Exception:
        return None


def _gun_number(gun_settings, method, int_cd):
    read = getattr(gun_settings, method, None)
    return read(int_cd) if read is not None else None


# Fair play: no armour readout under the reticle, Lesta forbids in-battle armour analysis.
class AimInfo(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.installed = False
        self.install()

    def on(self, key):
        return self.enabled() and bool(self.settings.get(key))

    @safe
    def install(self):
        if self.installed:
            return
        self.installed = True
        self._install_distance()
        self._install_tooltips()

    def _install_distance(self):
        if TargetDistancePlugin is None or not hasattr(TargetDistancePlugin, TRACK_METHOD):
            log('aim_info: the reticle distance stays stock')
            return
        component = self

        @override(TargetDistancePlugin, TRACK_METHOD)
        def _should_track(original, plugin, target):
            if component.on('target_distance'):
                return True
            return original(plugin, target)

    def _install_tooltips(self):
        if ConsumablesPanel is None or not hasattr(ConsumablesPanel, SHELL_TOOLTIP_METHOD):
            log('aim_info: the shell tooltips stay stock')
            return
        component = self

        @override(ConsumablesPanel, SHELL_TOOLTIP_METHOD)
        def _make_shell_tooltip(original, panel, descriptor, gun_settings, int_cd, *args, **kwargs):
            tooltip = original(panel, descriptor, gun_settings, int_cd, *args, **kwargs)
            if not component.on('shell_tooltips'):
                return tooltip
            return component.shell_tooltip(tooltip, descriptor, gun_settings, int_cd)

    def shell_tooltip(self, tooltip, descriptor, gun_settings, int_cd):
        piercing = _gun_number(gun_settings, 'getPiercingPower', int_cd)
        stats = shell_stats(
            getattr(descriptor, 'damage', None),
            piercing[0] if isinstance(piercing, (tuple, list)) and piercing else None,
            _gun_number(gun_settings, 'getShotSpeed', int_cd),
            _speed_factor(),
        )
        return with_lines(tooltip, shell_lines(stats, self.app.translate, not has_body(tooltip)))
