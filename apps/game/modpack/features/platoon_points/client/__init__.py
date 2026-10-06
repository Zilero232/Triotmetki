from __future__ import absolute_import, division, print_function, unicode_literals

from BattleFeedbackCommon import BATTLE_EVENT_TYPE

from ....core.client.battle import arena, arena_dp, call, feedback, is_enemy, summary_assist, vehicle_state
from ....core.client.game import values_by_name
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.log import safe
from .. import settings
from ..i18n import STRINGS
from ..model import Platoon, preview
from ..model.constants import KIND_DAMAGE, PREVIEW_SIZE
from ..model.text import points_text
from ..model.widget import points_widget
from .constants import KIND_BY_EVENT, NOT_IN_PLATOON

try:
    from gui.battle_control.battle_constants import FEEDBACK_EVENT_ID, VEHICLE_VIEW_STATE
except ImportError:
    FEEDBACK_EVENT_ID = None
    VEHICLE_VIEW_STATE = None


def _member(info, is_own):
    vehicle_type = getattr(info, 'vehicleType', None)
    return {
        'name': getattr(getattr(info, 'player', None), 'name', None),
        'own': is_own,
        'class': getattr(vehicle_type, 'classTag', None),
        'max_hp': getattr(vehicle_type, 'maxHealth', None),
        'alive': bool(call(info, 'isAlive', True)),
    }


PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


# Tournament-style points. The own damage and assist from the own feedback (raised to the client's summary); the
# platoon from the arena data (arena_dp.isSquadMan), its frags from the arena's kills (the kill feed), HP from the
# health updates the client receives for the team panels and markers.
class PlatoonPointsPanel(BattlePanel):

    def __init__(self, app):
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, KIND_BY_EVENT)
        self.health_event = getattr(FEEDBACK_EVENT_ID, 'VEHICLE_HEALTH', None)
        self.health_state = getattr(VEHICLE_VIEW_STATE, 'HEALTH', None)
        self.platoon = None
        self.own_id = None
        BattlePanel.__init__(self, app, PANEL_SPEC)

    def start(self, player):
        self.platoon = Platoon()
        self.own_id = getattr(player, 'playerVehicleID', None)
        self._add_members()
        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_feedback)
        self.hooks.add(feedback, 'onPlayerSummaryFeedbackReceived', self._on_summary)
        self.hooks.add(feedback, 'onVehicleFeedbackReceived', self._on_vehicle_feedback)
        self.hooks.add(vehicle_state, 'onVehicleStateUpdated', self._on_vehicle_state)
        self.hooks.add(arena, 'onVehicleKilled', self._on_killed)
        self.hooks.add(arena, 'onVehicleAdded', self._on_arena_entry)
        self.hooks.add(arena, 'onVehicleUpdated', self._on_arena_entry)
        self.render()

    # A platoon mate whose arena entry comes after the battle loaded (a late connect) joins when it arrives. Each of the
    # thirty entries updates at the load (arena.onVehicleUpdated(vehicleID)): only that one is looked at.
    def _on_arena_entry(self, vehicle_id=None, *args):
        if self.platoon is None:
            return
        provider = arena_dp()
        info = call(provider, 'getVehicleInfo', None, vehicle_id) if vehicle_id is not None else None
        if info is None:
            self._add_members()
            self.render()
        elif self._add_member(provider, info):
            self.render()

    def _add_members(self):
        provider = arena_dp()
        for info in call(provider, 'getVehiclesInfoIterator', []) or []:
            self._add_member(provider, info)

    def _add_member(self, provider, info):
        vehicle_id = getattr(info, 'vehicleID', None)
        is_own = vehicle_id == self.own_id
        if not is_own and not call(provider, 'isSquadMan', False, vehicle_id):
            return False
        return self.platoon.add(vehicle_id, _member(info, is_own))

    def stop(self):
        self.platoon = None

    def _on_feedback(self, events):
        if self.platoon is None:
            return
        added = [self._add_event(event) for event in events]
        if any(added):
            self.render()

    def _add_event(self, event):
        kind = self.kinds.get(event.getBattleEventType())
        if kind is None:
            return False
        if kind == KIND_DAMAGE and not is_enemy(event.getTargetID()):
            return False
        return self.platoon.add_own(kind, call(event.getExtra(), 'getDamage', 0))

    def _on_summary(self, event):
        if self.platoon is None:
            return
        if self.platoon.apply_summary(call(event, 'getTotalDamage'), summary_assist(event)):
            self.render()

    def _on_vehicle_feedback(self, event_id, vehicle_id, value):
        if self.platoon is None or event_id != self.health_event:
            return
        if not isinstance(value, (list, tuple)) or not value:
            return
        if self.platoon.set_health(vehicle_id, value[0]):
            self.render()

    # HEALTH follows the controlled vehicle: after death it is the health of the ally the camera follows (RU 1.45
    # vehicle_state_ctrl), so it goes to that vehicle, as the team HP panel does.
    def _on_vehicle_state(self, state, value):
        if self.platoon is None or self.health_state is None or state != self.health_state:
            return
        if self.platoon.set_health(call(vehicle_state(), 'getControllingVehicleID'), value):
            self.render()

    def _on_killed(self, victim_id, killer_id, *args):
        if self.platoon is None:
            return
        if self.platoon.killed(victim_id, killer_id, is_enemy(victim_id)):
            self.render()

    @safe
    def render(self):
        if self.platoon is None:
            return
        if not self.platoon.is_platoon() and not self.settings.get('show_solo'):
            self.wait(NOT_IN_PLATOON)
            self.hide()
            return
        self.wait(None)
        text = points_text(self.platoon, self.settings, self.app.translate)
        self.show(text, points_widget(self.platoon, self.settings, self.app.translate))
