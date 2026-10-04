# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from BattleFeedbackCommon import BATTLE_EVENT_TYPE

from ....core.battle_tally import extra_amount
from ....core.client.battle import arena, call, feedback, is_enemy, personal_efficiency, vehicle_name
from ....core.client.game import player_tank_id, values_by_name
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.moe import moe_service
from ....core.events import EVENT_BATTLE_PROGRESS
from ....core.log import safe
from ..i18n import STRINGS
from ..model.battle import LiveTotals, battle_outcome, card_text, card_widget, live_moe, live_view
from ..model.battle.constants import PREVIEW_SIZE
from ..model.preview import live_preview_text, live_preview_widget
from ..settings import SUMMARY_PANEL_ID, SUMMARY_SCHEMA, SUMMARY_SWITCH, SWITCH
from .constants import (
    AFTERBATTLE,
    ANY_TARGET_KEYS,
    COUNTED_KEYS,
    EFFICIENCY_KINDS,
    LIVE_KIND_BY_EVENT,
    SUMMARY_GETTERS,
)

try:
    from constants import ARENA_PERIOD
except ImportError:
    ARENA_PERIOD = None

try:
    from gui.battle_control.battle_constants import PERSONAL_EFFICIENCY_TYPE
except ImportError:
    PERSONAL_EFFICIENCY_TYPE = None


PANEL_SPEC = PanelSpec(
    panel_id=SUMMARY_PANEL_ID,
    schema=SUMMARY_SCHEMA,
    switch=SUMMARY_SWITCH,
    strings=STRINGS,
    preview_size=PREVIEW_SIZE,
    preview_text=live_preview_text,
    preview_widget=live_preview_widget,
)


# «Итоги боя» in battle: counted from the start of the own battle, shown once the own vehicle is destroyed or the battle
# ended, and kept until the player leaves the battle (the stock overlays cover it like every panel).
#
# Fair play: onPlayerFeedbackReceived and onPlayerSummaryFeedbackReceived carry only the player's own events, the
# personal efficiency controller the totals of the stock damage log; the kill and the period are the arena's own events
# the stock page shows. XP is left out: the client has none before the results.
class BattleSummaryPanel(BattlePanel):

    def __init__(self, app):
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, LIVE_KIND_BY_EVENT)
        self.efficiency = values_by_name(PERSONAL_EFFICIENCY_TYPE, EFFICIENCY_KINDS)
        self.afterbattle = getattr(ARENA_PERIOD, AFTERBATTLE, None)
        self.moe = moe_service(app)
        self.totals = None
        self.battle = {}
        self.revealed = False
        BattlePanel.__init__(self, app, PANEL_SPEC)
        app.bus.on(EVENT_BATTLE_PROGRESS, self._on_progress)

    def enabled(self):
        return BattlePanel.enabled(self) and bool(self.app.config.is_enabled(SWITCH))

    def start(self, player):
        tank_id = player_tank_id(player)
        arena_type = getattr(arena(), 'arenaType', None)
        self.own_vehicle = getattr(player, 'playerVehicleID', None)
        self.own_team = getattr(player, 'team', None)
        self.totals = LiveTotals()
        self.revealed = False
        self.battle = {
            'vehicle': vehicle_name(self.own_vehicle),
            'map': getattr(arena_type, 'name', None),
            'snapshot': self.moe.snapshot(tank_id),
            'curve': self.moe.curve(tank_id),
            'pace': self.moe.pace(tank_id),
            'progress': None,
            'result': None,
        }

        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_feedback)
        self.hooks.add(feedback, 'onPlayerSummaryFeedbackReceived', self._on_summary)
        self.hooks.add(personal_efficiency, 'onTotalEfficiencyUpdated', self._on_efficiency)
        self.hooks.add(arena, 'onVehicleKilled', self._on_vehicle_killed)
        self.hooks.add(arena, 'onPeriodChange', self._on_period)

    def stop(self):
        self.totals = None
        self.revealed = False

    def settings_changed(self, changed):
        self.render()

    def _on_progress(self, state):
        if self.totals is not None:
            self.battle['progress'] = state
            self.render()

    def _on_feedback(self, events):
        if self.totals is None:
            return
        added = [self._count(event) for event in events]
        if any(added):
            self.render()

    def _count(self, event):
        key = self.kinds.get(call(event, 'getBattleEventType'))
        if key is None:
            return False
        if key not in ANY_TARGET_KEYS and not is_enemy(call(event, 'getTargetID')):
            return False
        if key in COUNTED_KEYS:
            return self.totals.add(key)
        return self.totals.add(key, extra_amount(call(event, 'getExtra')))

    def _on_summary(self, event):
        if self.totals is None:
            return
        raised = [self.totals.raise_to(key, call(event, getter)) for getter, key in SUMMARY_GETTERS]
        if any(raised):
            self.render()

    def _on_efficiency(self, totals):
        if self.totals is None:
            return
        raised = [self.totals.raise_to(self.efficiency.get(kind), value) for kind, value in (totals or {}).items()]
        if any(raised):
            self.render()

    def _on_vehicle_killed(self, victim_id, *args):
        if self.totals is not None and victim_id == self.own_vehicle:
            self.reveal()

    def _on_period(self, period, *args):
        if self.totals is None or period != self.afterbattle:
            return
        self.battle['result'] = battle_outcome(args[2] if len(args) > 2 else None, self.own_team)
        self.reveal()

    def reveal(self):
        self.revealed = True
        self.render()

    @safe
    def render(self):
        if self.totals is None or not self.revealed:
            return
        battle = self.battle
        moe = live_moe(battle['snapshot'], self.totals.combined(), battle['curve'], battle['pace'])
        view = live_view(dict(battle, stats=self.totals.stats(), moe=moe), self.app.translate)
        self.show(card_text(view, self.settings.get('font_size')), card_widget(view))
