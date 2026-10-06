"""Feeds `core.battle_tally.BattleTally` from the player's own battle feedback and writes its lines to python.log when
the battle ends, so a live test shows which hooks attached and what the client reported."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....battle_tally import EFFICIENCY_KEYS, EVENT_KEYS, MARKER_OUTCOMES, BattleTally, efficiency_totals
from ....log import log
from ...game import values_by_name
from ..hooks import BattleHooks
from ..session import call, controls_own_vehicle, feedback, is_enemy, personal_efficiency

try:
    from BattleFeedbackCommon import BATTLE_EVENT_TYPE
except ImportError:
    BATTLE_EVENT_TYPE = None

try:
    from gui.battle_control.battle_constants import FEEDBACK_EVENT_ID
except ImportError:
    FEEDBACK_EVENT_ID = None

try:
    from gui.battle_control.battle_constants import PERSONAL_EFFICIENCY_TYPE
except ImportError:
    PERSONAL_EFFICIENCY_TYPE = None


class BattleTallyLog(object):
    """`start()` on the own battle's avatar ready, `stop()` on leave (writes the summary)."""

    def __init__(self):
        self.markers = values_by_name(FEEDBACK_EVENT_ID, MARKER_OUTCOMES)
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, EVENT_KEYS)
        self.efficiency = values_by_name(PERSONAL_EFFICIENCY_TYPE, EFFICIENCY_KEYS)
        self.hooks = BattleHooks()
        self.tally = None

    def start(self):
        self.stop()
        self.tally = BattleTally()
        report = self.tally.hooked
        self.hooks.add(feedback, 'onVehicleFeedbackReceived', self._on_vehicle_feedback, report)
        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_player_feedback, report)
        self.hooks.add(personal_efficiency, 'onTotalEfficiencyUpdated', self._on_efficiency, report)

    def stop(self):
        tally = self.tally
        self.tally = None
        self.hooks.clear()
        if tally is None:
            return
        controller = personal_efficiency()
        if controller is not None:
            totals = {kind: call(controller, 'getTotalEfficiency', None, kind) for kind in self.efficiency}
            tally.apply_vanilla(efficiency_totals(totals, self.efficiency))
        for line in tally.summary():
            log(line)

    def _on_vehicle_feedback(self, event_id, vehicle_id, value):
        outcome = self.markers.get(event_id)
        if self.tally is not None and outcome is not None and controls_own_vehicle():
            self.tally.add_marker(outcome)

    def _on_player_feedback(self, events):
        if self.tally is not None:
            self.tally.add_events(events, self.kinds, is_enemy)

    def _on_efficiency(self, totals):
        if self.tally is not None:
            self.tally.apply_vanilla(efficiency_totals(totals, self.efficiency))
