from __future__ import absolute_import, division, print_function, unicode_literals

import time

from BattleFeedbackCommon import BATTLE_EVENT_TYPE

from ....core.battle_tally import EFFICIENCY_KEYS, MARKER_OUTCOMES, efficiency_totals
from ....core.client.battle import (
    SHOT_METHOD,
    call,
    controls_own_vehicle,
    damage_source,
    feedback,
    is_enemy,
    on_own_shot,
    personal_efficiency,
    player,
    vehicle_class,
    vehicle_info,
    vehicle_name,
    vehicle_state,
)
from ....core.client.game import values_by_name
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.hud.stock import BATTLE_DAMAGE_LOG_PANEL
from ....core.log import log, safe
from ....core.shells import shell_code
from .. import settings
from ..i18n import STRINGS
from ..model import DamageLog, Hit, preview
from ..model.constants import PREVIEW_SIZE
from ..model.received import is_ricochet
from ..model.shots import own_shot_health
from ..model.text import format_damage_log
from ..model.widget import damage_log_widget
from ..model.constants import KIND_DAMAGE
from .constants import AMMO_RACK_DEVICE, AMMO_RACK_STATES, CRIT_KINDS, DEALT_KINDS, EVENT_KINDS

try:
    from gui.battle_control.battle_constants import FEEDBACK_EVENT_ID
except ImportError:
    FEEDBACK_EVENT_ID = None

try:
    from gui.battle_control.battle_constants import VEHICLE_VIEW_STATE
except ImportError:
    VEHICLE_VIEW_STATE = None

try:
    from gui.battle_control.battle_constants import PERSONAL_EFFICIENCY_TYPE
except ImportError:
    PERSONAL_EFFICIENCY_TYPE = None


def is_ammo_rack_damage(value):
    if not isinstance(value, (list, tuple)) or len(value) < 2:
        return False

    device, device_state = value[0], value[1]
    return device == AMMO_RACK_DEVICE and device_state in AMMO_RACK_STATES


def event_hit(vehicle_id, extra, now):
    return Hit(
        vehicle_id=vehicle_id,
        vehicle=vehicle_name(vehicle_id),
        vehicle_class=vehicle_class(vehicle_id),
        shell=shell_code(call(extra, 'getShellType')),
        gold=call(extra, 'isShellGold', False),
        source=damage_source(extra),
        at=now,
    )


PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


class DamageLogPanel(BattlePanel):

    def __init__(self, app):
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, EVENT_KINDS)
        self.outcomes = values_by_name(FEEDBACK_EVENT_ID, MARKER_OUTCOMES)
        self.health_event = getattr(FEEDBACK_EVENT_ID, 'VEHICLE_HEALTH', None)
        self.devices_state = getattr(VEHICLE_VIEW_STATE, 'DEVICES', None)
        self.efficiency = values_by_name(PERSONAL_EFFICIENCY_TYPE, EFFICIENCY_KEYS)
        self.log = None
        BattlePanel.__init__(self, app, PANEL_SPEC)
        if not on_own_shot(self.on_own_shot):
            log('damage log: Vehicle.%s not hooked, ricochets on you stay blocked hits' % SHOT_METHOD)

    def start(self, player):
        self.log = DamageLog()
        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_feedback)
        self.hooks.add(feedback, 'onPlayerSummaryFeedbackReceived', self._on_summary)
        self.hooks.add(feedback, 'onVehicleFeedbackReceived', self._on_vehicle_feedback)
        self.hooks.add(vehicle_state, 'onVehicleStateUpdated', self._on_vehicle_state)
        self.hooks.add(personal_efficiency, 'onTotalEfficiencyUpdated', self._on_efficiency)
        self.render()

    def stop(self):
        self.log = None

    def stock_aliases(self):
        return () if self.settings.get('keep_stock') else (BATTLE_DAMAGE_LOG_PANEL,)

    # RU 1.45 Avatar.py:1623-1627: feedback carries only the own events while the camera follows them.
    def _on_feedback(self, events):
        if self.log is None:
            return

        now = time.time()
        changed = False
        for event in events:
            changed = self._add_event(event, now) or changed

        if changed:
            self.render()

    def _add_event(self, event, now):
        kind = self.kinds.get(event.getBattleEventType())
        extra = event.getExtra() if kind is not None else None
        vehicle_id = event.getTargetID()
        if extra is None or (kind in DEALT_KINDS and not is_enemy(vehicle_id)):
            return False

        hit = event_hit(vehicle_id, extra, now)
        if kind in CRIT_KINDS:
            return self.log.add_crits(kind, call(extra, 'getCritsCount', 0), hit)

        added = self.log.add(kind, call(extra, 'getDamage', 0), hit)
        if added and kind == KIND_DAMAGE:
            self._describe(vehicle_id)
        return added

    # Fair play: only the class and max HP the enemy marker and the player panels already show.
    def _describe(self, vehicle_id):
        if vehicle_id in self.log.shots.targets:
            return

        vehicle_type = getattr(vehicle_info(vehicle_id), 'vehicleType', None)
        self.log.shots.describe(vehicle_id, vehicle_class(vehicle_id), getattr(vehicle_type, 'maxHealth', None))

    def _on_vehicle_feedback(self, event_id, vehicle_id, value):
        if self.log is None or not controls_own_vehicle():
            return

        if event_id == self.health_event:
            changed = self._set_health(vehicle_id, value)
        else:
            changed = self._add_marker(event_id, vehicle_id)

        if changed:
            self.render()

    def _set_health(self, vehicle_id, value):
        health = own_shot_health(value, getattr(player(), 'playerVehicleID', None))
        return self.log.shots.set_health(vehicle_id, health, time.time())

    def _add_marker(self, event_id, vehicle_id):
        outcome = self.outcomes.get(event_id)
        if outcome is None or not is_enemy(vehicle_id):
            return False

        added = self.log.shots.add_result(vehicle_id, outcome, time.time(), vehicle_name(vehicle_id))
        if added:
            self._describe(vehicle_id)
        return added

    # The feedback has no own-tank ricochet: the client's Vehicle.showDamageFromShot effect marks it.
    @safe
    def on_own_shot(self, attacker_id, points):
        if self.log is None or not is_ricochet(points):
            return
        if not is_enemy(attacker_id) or not controls_own_vehicle():
            return

        name, tag = vehicle_name(attacker_id), vehicle_class(attacker_id)
        hit = Hit(vehicle_id=attacker_id, vehicle=name, vehicle_class=tag, at=time.time())
        if self.log.received.ricochet(hit):
            self.render()

    # RU 1.45 Avatar.showVehicleDamageInfo: DEVICES follows the ally the camera follows after death.
    def _on_vehicle_state(self, state, value):
        if self.log is None or self.devices_state is None or state != self.devices_state:
            return
        if not controls_own_vehicle() or not is_ammo_rack_damage(value):
            return

        if self.log.received.ammo_rack_hit(time.time()):
            self.render()

    def _on_summary(self, event):
        self._apply_summary(
            call(event, 'getTotalDamage'),
            call(event, 'getTotalAssistDamage'),
            call(event, 'getTotalBlockedDamage'),
            call(event, 'getTotalStunDamage'),
        )

    # RU 1.45 client source: personal_efficiency_ctrl, the stock damage log's own totals.
    def _on_efficiency(self, totals):
        picked = efficiency_totals(totals, self.efficiency)
        self._apply_summary(picked.get('dealt'), picked.get('assist'), picked.get('blocked'), picked.get('stun'))

    def _apply_summary(self, damage, assist, blocked, stun):
        if self.log is not None and self.log.apply_summary(damage, assist, blocked, stun):
            self.render()

    @safe
    def render(self):
        if self.log is None:
            return

        translate = self.app.translate
        text = format_damage_log(self.log, self.settings, translate)
        payload = damage_log_widget(self.log, self.settings, translate)
        self.show(text, payload)
