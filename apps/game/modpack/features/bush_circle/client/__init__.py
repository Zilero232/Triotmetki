from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.battle import BattleHooks, arena, vehicle_state
from ....core.client.component import FeatureComponent
from ....core.client.hotkey import HotkeyChoice
from ....core.log import guarded, log_exception, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import CircleState, color_of, diameter
from ..model.constants import HOTKEYS, MODE_HOTKEY
from ..settings import SCHEMA, SWITCH
from .constants import CIRCLE_VISUAL, CUT_OFF_DISTANCE, ENTITY_ATTEMPTS, ENTITY_RETRY_S, OVER_TERRAIN_HEIGHT


@guarded('bush circle: remove')
def _detach(owner, model):
    owner.delModel(model)


class BushCircle(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.state = None
        self.vehicle_id = None
        self.model = None
        self.owner = None
        self.hotkey = HotkeyChoice(HOTKEYS, self._on_hotkey)
        self.hooks = BattleHooks()
        self.generation = 0
        bus = app.bus
        bus.on('battle_ready', self._on_battle_ready)
        bus.on('battle_leave', self._on_battle_leave)

    def _on_battle_ready(self, battle_player):
        self._on_battle_leave()
        if not self.enabled():
            return
        self.state = CircleState(self.settings.get('mode'))
        self.vehicle_id = getattr(battle_player, 'playerVehicleID', None)
        self.hooks.add(arena, 'onVehicleKilled', self._on_vehicle_killed)
        self.hooks.add(vehicle_state, 'onVehicleControlling', self._on_vehicle_controlling)
        self._install_hotkey()
        self.apply()

    def _on_battle_leave(self):
        self.generation += 1
        self.hooks.clear()
        self.hotkey.remove()
        self._remove()
        self.state = None

    def settings_changed(self, changed):
        if not self.enabled():
            self._on_battle_leave()
            return
        if self.state is not None:
            self.state.mode = self.settings.get('mode')
            self._remove()
            self._install_hotkey()
            self.apply()

    def _install_hotkey(self):
        hotkey = None
        if self.settings.get('mode') == MODE_HOTKEY:
            hotkey = self.settings.get('hotkey')
        self.hotkey.set(hotkey)

    @safe
    def _on_hotkey(self):
        if self.state is not None and self.state.toggle():
            self.apply()

    def _on_vehicle_killed(self, victim_id, *args):
        if self.state is None or victim_id != self.vehicle_id:
            return
        if self.state.killed():
            self.apply()

    # RU 1.45 vehicle_state_ctrl._setup: the controlled vehicle changes on respawn and after death.
    def _on_vehicle_controlling(self, vehicle):
        if self.state is None or not getattr(vehicle, 'isPlayerVehicle', False):
            return
        if vehicle.id != self.vehicle_id:
            self._remove()
            self.vehicle_id = vehicle.id
        self.state.respawned()
        self.apply()

    @safe
    def apply(self, attempt=0):
        if self.state is None or not self.state.wanted():
            self._remove()
            return
        if self.model is not None:
            return

        entity = self._own_entity()
        if entity is not None:
            self._create(entity)
        elif attempt + 1 < ENTITY_ATTEMPTS:
            generation = self.generation
            BigWorld.callback(ENTITY_RETRY_S, lambda: self._retry(generation, attempt + 1))

    def _own_entity(self):
        if not self.vehicle_id:
            return None
        return BigWorld.entity(self.vehicle_id)

    def _retry(self, generation, attempt):
        if generation == self.generation:
            self.apply(attempt)

    # On battle_leave BigWorld.player() may already be the account.
    def _create(self, entity):
        import Math
        try:
            model = BigWorld.Model('')
            area = BigWorld.PyTerrainSelectedArea()
            size = diameter()
            color = color_of(self.settings.get('color'))
            area.setup(CIRCLE_VISUAL, Math.Vector2(size, size), OVER_TERRAIN_HEIGHT, color)
            area.enableAccurateCollision(True)
            area.setCutOffDistance(CUT_OFF_DISTANCE)
            model.node('').attach(area)
            self.owner = BigWorld.player()
            self.owner.addModel(model)
            self.model = model
            model.addMotor(BigWorld.Servo(entity.matrix))
        except Exception:
            log_exception('bush circle: create')
            self._remove()

    def _remove(self):
        model = self.model
        owner = self.owner
        self.model = None
        self.owner = None
        if model is None or owner is None:
            return
        _detach(owner, model)
