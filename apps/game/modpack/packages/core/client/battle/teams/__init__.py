# -*- coding: utf-8 -*-
"""Feeds `core.teams.TeamHp` from the battle session: the arena data behind the player panels, the numbers of the
client's own BattleFieldCtrl (the stock score strip's source, `feed`), the health updates the client receives for
markers and panels, the own vehicle's HP and the arena's kills; the arena's vehicle updates and recoveries (the
respawn modes) read the arena data again. Shared by the team HP panel and the «Основной калибр»
counter; each panel owns one tracker and calls `on_change()` to redraw."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....teams import TeamHp
from ..session import arena, arena_dp, call, feedback, vehicle_state
from .feed import battle_field_feed

try:
    from gui.battle_control.battle_constants import FEEDBACK_EVENT_ID, VEHICLE_VIEW_STATE
except ImportError:
    FEEDBACK_EVENT_ID = None
    VEHICLE_VIEW_STATE = None


def own_team(player):
    team = getattr(player, 'team', None)
    if team is None:
        team = call(arena_dp(), 'getNumberOfTeam')
    return team


class TeamTracker(object):

    def __init__(self, on_change):
        self.on_change = on_change
        self.health_event = getattr(FEEDBACK_EVENT_ID, 'VEHICLE_HEALTH', None)
        self.dead_event = getattr(FEEDBACK_EVENT_ID, 'VEHICLE_DEAD', None)
        self.health_state = getattr(VEHICLE_VIEW_STATE, 'HEALTH', None)
        self.feed = battle_field_feed()
        self.teams = None
        self.unknown = set()

    def start(self, hooks, player):
        """Starts tracking for the battle of `player`; `hooks` is the panel's BattleHooks (cleared on leave)."""
        self.teams = TeamHp(own_team(player))
        self.unknown = set()
        hooks.add(feedback, 'onVehicleFeedbackReceived', self._on_vehicle_feedback)
        hooks.add(vehicle_state, 'onVehicleStateUpdated', self._on_vehicle_state)
        hooks.add(arena, 'onVehicleKilled', self._on_vehicle_killed)
        hooks.add(arena, 'onVehicleAdded', self._on_vehicle_added)
        hooks.add(arena, 'onVehicleUpdated', self._on_vehicle_added)
        hooks.add(arena, 'onVehicleRecovered', self._on_vehicle_added)
        self.feed.listen(self._on_battle_field)
        self.sync()

    def stop(self):
        self.feed.forget(self._on_battle_field)
        self.teams = None

    def sync(self):
        provider = arena_dp()
        if self.teams is None or provider is None:
            return
        for info in provider.getVehiclesInfoIterator():
            vehicle_type = getattr(info, 'vehicleType', None)
            self.teams.add(
                info.vehicleID,
                info.team,
                getattr(vehicle_type, 'maxHealth', None),
                alive=bool(call(info, 'isAlive', True)),
                kind=getattr(vehicle_type, 'classTag', None),
                level=getattr(vehicle_type, 'level', None),
            )
        self._apply_feed()
        self.on_change()

    def _apply_feed(self):
        changed = False
        for vehicle_id, hp in self.feed.health.items():
            changed = self.teams.set_health(vehicle_id, hp) or changed
        for vehicle_id in self.feed.dead:
            changed = self.teams.kill(vehicle_id) or changed
        if self.feed.team_health is not None:
            changed = self.teams.set_team_health(*self.feed.team_health) or changed
        return changed

    def _on_battle_field(self):
        if self.teams is not None and self._apply_feed():
            self.on_change()

    def _on_vehicle_added(self, vehicle_id, *args):
        self.sync()

    def _on_vehicle_feedback(self, event_id, vehicle_id, value):
        if self.teams is None:
            return
        if vehicle_id not in self.teams.vehicles and vehicle_id not in self.unknown:
            self.unknown.add(vehicle_id)
            self.sync()
        if self._apply_feedback(event_id, vehicle_id, value):
            self.on_change()

    def _apply_feedback(self, event_id, vehicle_id, value):
        if event_id == self.health_event and isinstance(value, (list, tuple)) and value:
            return self.teams.set_health(vehicle_id, value[0])
        if event_id == self.dead_event:
            return self.teams.kill(vehicle_id)
        return False

    def _on_vehicle_state(self, state, value):
        if self.teams is None or state != self.health_state or self.health_state is None:
            return
        if self.teams.set_health(call(vehicle_state(), 'getControllingVehicleID'), value):
            self.on_change()

    def _on_vehicle_killed(self, victim_id, *args):
        if self.teams is not None and self.teams.kill(victim_id):
            self.on_change()
