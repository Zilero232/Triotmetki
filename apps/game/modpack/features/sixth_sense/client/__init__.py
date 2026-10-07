from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.battle import arena, call, controls_own_vehicle, player, vehicle_state
from ....core.client.game import values_by_name
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.timer import Ticker
from ....core.hud.stock import SIXTH_SENSE
from ....core.log import log, safe
from .. import settings
from ..i18n import STRINGS
from ..model import SixthSense, format_sixth_sense, icon_gallery, lamp_duration, preview
from ..model.constants import (
    ENDING_PERIODS,
    LAMP_HIDE,
    LAMP_SHOW,
    OBSERVED,
    OWN_SPOTTING_ATTR,
    PREVIEW_SIZE,
    VEHICLE_STATES,
)
from ..model.widget import sixth_sense_widget
from ..settings import ICON_SETS
from .constants import FIRST_LIGHT, NO_STATES, NOT_SPOTTED, TICK_S

try:
    from constants import ARENA_PERIOD
    from gui.battle_control.battle_constants import VEHICLE_VIEW_STATE
    from PlayerEvents import g_playerEvents
except ImportError:
    ARENA_PERIOD = VEHICLE_VIEW_STATE = g_playerEvents = None


# RU 1.45 client source: PlayerAvatar.getVehicleDescriptor().miscAttrs (_updateAttributes).
def own_spotting_decrease():
    descriptor = call(player(), 'getVehicleDescriptor')
    attributes = getattr(descriptor, 'miscAttrs', None) or {}
    return attributes.get(OWN_SPOTTING_ATTR, 0.0)


PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


class SixthSenseAlert(BattlePanel):

    stock_while_hidden = True

    def __init__(self, app):
        self.states = values_by_name(VEHICLE_VIEW_STATE, VEHICLE_STATES)
        self.ending_periods = values_by_name(ARENA_PERIOD, [(name, True) for name in ENDING_PERIODS])
        self.lamp = None
        self.has_lit = False
        self.ticker = Ticker(TICK_S, self._tick)
        BattlePanel.__init__(self, app, PANEL_SPEC)

    def start(self, player):
        if not self.states:
            self.wait(NO_STATES)
            return
        self.wait(NOT_SPOTTED)
        self.has_lit = False
        self.lamp = SixthSense()
        self.hooks.add(vehicle_state, 'onVehicleStateUpdated', self._on_vehicle_state)
        self.hooks.add(vehicle_state, 'onVehicleControlling', self._read_spotted)
        self.hooks.add(arena, 'onPeriodChange', self._on_period)
        self.hooks.add(lambda: g_playerEvents, 'onRoundFinished', self._finish)
        self._read_spotted(call(vehicle_state(), 'getControllingVehicle'))

    def stop(self):
        self.lamp = None
        self.ticker.stop()

    def ui_gallery(self):
        return icon_gallery(ICON_SETS)

    def stock_aliases(self):
        return (SIXTH_SENSE,) if self.lamp is not None and self.settings.get('replace_stock') else ()

    def _on_vehicle_state(self, state, value):
        name = self.states.get(state)
        if self.lamp is None or name is None:
            return
        if name == OBSERVED and not controls_own_vehicle():
            return
        self._apply_state(name, value)

    # RU 1.45 battle/shared/indicators.py SixthSenseIndicator reads sixthSenseState on a vehicle change.
    def _read_spotted(self, vehicle):
        if self.lamp is None or vehicle is None or not controls_own_vehicle():
            return
        if bool(getattr(vehicle, 'sixthSenseState', False)) and call(vehicle, 'isAlive', True):
            self._apply_state(OBSERVED, True)

    def _apply_state(self, name, value):
        duration = lamp_duration(self.settings.get('hide_after_s'), own_spotting_decrease())
        change = self.lamp.vehicle_state(name, value, time.time(), duration)

        if change == LAMP_SHOW:
            self._light()
        elif change == LAMP_HIDE:
            self.hide()

    def _light(self):
        if not self.has_lit:
            self.has_lit = True
            log(FIRST_LIGHT)
        self.render()
        self.ticker.start()

    def _on_period(self, period, *_):
        if period in self.ending_periods:
            self._finish()

    def _finish(self, *_):
        if self.lamp is not None:
            self.lamp.finish()
        self.hide()

    def _tick(self):
        lamp = self.lamp
        if lamp is None or not lamp.lit:
            return False

        was_expired = lamp.expired(time.time())
        self.render()
        return not was_expired

    @safe
    def render(self):
        lamp = self.lamp
        if lamp is None or not lamp.lit:
            return

        now = time.time()
        text = format_sixth_sense(lamp, self.settings, self.app.translate, now)
        payload = sixth_sense_widget(lamp, self.settings, self.app.translate, now)
        self.show(text, payload)
