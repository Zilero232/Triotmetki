"""Keeps the stock damage log hidden when it shows itself past the battle page.

RU 1.45 client source (gui/Scaleform/daapi/view/battle/shared/damage_log_panel.py): `DamageLogPanel` decides its own
visibility in `_invalidatePanelVisibility`, run on every postmortem and vehicle switch
(`vehicleState.onPostMortemSwitched`, `onVehicleControlling`) and when Tab is let go: shown on the own vehicle, hidden
while the camera follows another one. When that flips it calls `_setSettings(isVisible, isColorBlind)`, that is
`BattleDamageLogPanelMeta.as_setSettingsDamageLogComponentS`, and the AS3 side (gui_battle
net/wg/gui/components/battleDamagePanel/BattleDamageLogPanel.as `setSettingsDamageLogComponent`) sets the panel's
`visible` itself, past the page's `setComponentsVisibility`: after the own vehicle is destroyed the stock log came back
under ours although the page kept it hidden. We wrap the meta call: while the page hides the alias for us the original
gets `isVisible` off (the colour-blind switch passes as it is). The last call of every panel is kept, so the log given
back takes the panel's own choice again: one it wanted hidden (the camera on another tank) is hidden once more.

The other stock elements our panels hide follow the page: SixthSense.as keeps `setCompVisible`
(`_visibilityInBattlePage`) over its own `as_show`, and FragCorrelationBar.as and BattleTimer.as never set their own
`visible`.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....hooks import override
from ....hud.stock import BATTLE_DAMAGE_LOG_PANEL, DAMAGE_LOG_VISIBLE, switch_of, switched_off
from ....log import guarded, log, safe

try:
    from gui.Scaleform.daapi.view.meta.BattleDamageLogPanelMeta import BattleDamageLogPanelMeta
    IMPORT_ERROR = None
except Exception as error:
    BattleDamageLogPanelMeta = None
    IMPORT_ERROR = error


class DamageLogControl(object):

    def __init__(self):
        self.is_hiding = False
        self.panels = {}
        self.installed = False

    @safe
    def install(self):
        if self.installed:
            return
        self.installed = True
        if IMPORT_ERROR is not None:
            log('HUD: the stock damage log may show itself (damage log panel: %s)' % IMPORT_ERROR)
            return
        control = self

        @override(BattleDamageLogPanelMeta, 'as_setSettingsDamageLogComponentS')
        def _set_settings(original, panel, *args, **kwargs):
            control.panels[id(panel)] = (panel, args, kwargs)
            if control.is_hiding:
                args, kwargs = switched_off(args, kwargs, DAMAGE_LOG_VISIBLE)
            return original(panel, *args, **kwargs)

    def follow(self, hidden_aliases):
        """The stock aliases the page hides for us now; the damage log given back gets its own last choice."""
        was_hiding = self.is_hiding
        self.is_hiding = BATTLE_DAMAGE_LOG_PANEL in hidden_aliases
        if was_hiding and not self.is_hiding:
            self._hide_where_the_panel_asked()

    def reset(self):
        self.is_hiding = False
        self.panels = {}

    def _hide_where_the_panel_asked(self):
        for panel, args, kwargs in list(self.panels.values()):
            if not switch_of(args, kwargs, DAMAGE_LOG_VISIBLE):
                _repeat(panel, args, kwargs)


@guarded('HUD: the stock damage log settings')
def _repeat(panel, args, kwargs):
    panel.as_setSettingsDamageLogComponentS(*args, **kwargs)
