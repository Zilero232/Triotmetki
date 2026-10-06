# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from BattleFeedbackCommon import BATTLE_EVENT_TYPE

from ....core.client.battle import call, feedback, is_enemy
from ....core.client.game import player_tank_id, values_by_name
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.moe import moe_service
from ....core.log import safe
from .. import settings
from ..i18n import STRINGS
from ..model import BattleTotals, format_panel, panel_state, preview
from ..model.constants import KIND_DAMAGE, PREVIEW_SIZE
from ..model.widget import marks_widget
from ..settings import CARD_PANEL_ID
from .card import TankCardPanel
from .constants import KIND_BY_EVENT, NO_SNAPSHOT


PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


# The «Отметки» feature: this battle panel and the hangar Tank card (`card`, a component of its own with the marks
# history page of the window).
#
# Fair play: `onPlayerFeedbackReceived` carries only the player's own events. Avatar.onBattleEvents and
# battleEventsSummary reach the feedback only while the camera follows the own vehicle (RU 1.45 Avatar.py:1623-1642),
# as in the vanilla damage log; the summary raises the totals.
class MarksPanel(BattlePanel):

    def __init__(self, app):
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, KIND_BY_EVENT)
        self.moe = moe_service(app)
        self.totals = None
        self.snapshot = None
        self.tank_id = None
        self.curve = None
        self.pace = None
        BattlePanel.__init__(self, app, PANEL_SPEC)
        self.card = TankCardPanel(app)
        self.moe.listen(self._on_curve)

    def start(self, player):
        tank_id = player_tank_id(player)
        snapshot = self.moe.snapshot(tank_id)
        if snapshot is None:
            self.wait(NO_SNAPSHOT % tank_id)
            return
        self.snapshot = snapshot
        self.tank_id = tank_id
        self.curve = self.moe.curve(tank_id)
        self.moe.ensure(tank_id)
        self.pace = self.moe.pace(tank_id)
        self.totals = BattleTotals()
        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_feedback)
        self.hooks.add(feedback, 'onPlayerSummaryFeedbackReceived', self._on_summary)
        self.render()

    def stop(self):
        self.totals = None
        self.snapshot = None

    def settings_changed(self, changed):
        self.render()

    def _on_curve(self, tank_id):
        if self.totals is not None and tank_id == self.tank_id:
            self.curve = self.moe.curve(tank_id)
            self.render()

    def _on_feedback(self, events):
        if self.totals is None:
            return
        added = [self._add_event(event) for event in events]
        if any(added):
            self.render()

    def _add_event(self, event):
        kind = self.kinds.get(event.getBattleEventType())
        if kind is None:
            return False
        extra = event.getExtra()
        if extra is None:
            return False
        if kind == KIND_DAMAGE and not is_enemy(event.getTargetID()):
            return False
        return self.totals.add(kind, extra.getDamage())

    def _on_summary(self, event):
        if self.totals is None:
            return
        damage = call(event, 'getTotalDamage')
        stun = call(event, 'getTotalStunDamage')
        if self.totals.apply_summary(damage, stun):
            self.render()

    @safe
    def render(self):
        if self.totals is None or self.snapshot is None:
            return
        state = panel_state(self.snapshot, self.totals.combined(), self.curve, self.pace, self.settings)
        text = format_panel(state, self.settings, self.app.translate)
        self.show(text, marks_widget(state, self.settings, self.app.translate))

    def ui_parts(self):
        return {CARD_PANEL_ID: self.card}
