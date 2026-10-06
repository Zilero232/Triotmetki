from __future__ import absolute_import, division, print_function, unicode_literals

from BattleFeedbackCommon import BATTLE_EVENT_TYPE

from ....core.client.battle import arena, call, dealt_damage, feedback, is_enemy, shared
from ....core.client.battle.teams import TeamTracker
from ....core.client.game import on_vehicle_changed, player_tank_id, selected_tank_id, values_by_name
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.me import tank_ratings
from ....core.client.timer import Ticker
from ....core.compat import is_number
from ....core.log import safe
from .. import settings
from ..i18n import STRINGS
from ..model import BattleCounts, preview, progress_state
from ..model.constants import ANY_TARGET_KEYS, KIND_BY_EVENT, PREVIEW_SIZE, REACHED
from ..model.main_gun import main_gun_applies, main_gun_state
from ..model.rows import progress_rows
from ..model.text import format_panel
from ..model.widget import panel_widget
from .constants import ALLY_HIT_MESSAGE, REACHED_BAR_S


def battle_messages():
    return shared('messages')


# RU 1.45 client source: the extra of BASE_CAPTURE_DROPPED is the plain points count
# (feedback_events._unpackInteger), which the defence ribbon shows (ribbons_aggregator._BaseCaptureRibbon).
def defence_points(event):
    extra = call(event, 'getExtra')
    if is_number(extra):
        return extra
    return call(event, 'getCount', 0)


PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


# One plate for this battle's targets. The tank's site row (WN8, expected values) is read in the hangar when the vehicle
# is selected and kept for the battle.
class BattleProgressPanel(BattlePanel):

    def __init__(self, app):
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, KIND_BY_EVENT)
        self.tanks = tank_ratings(app)
        self.teams = TeamTracker(self.render)
        self.settle = Ticker(REACHED_BAR_S, self._on_settled)
        self.counts = None
        self.row = None
        self.has_main_gun = False
        self.hit_ally = False
        self.settled = False
        BattlePanel.__init__(self, app, PANEL_SPEC)

        app.bus.on('hangar', self._on_vehicle_changed)
        on_vehicle_changed(self._on_vehicle_changed, 'battle progress')

    def _on_vehicle_changed(self):
        tank_id = selected_tank_id()
        if tank_id and self.enabled_in_hangar():
            self.tanks.ensure(tank_id)

    def settings_changed(self, changed):
        self.render()

    def start(self, player):
        self.row = self.tanks.row(player_tank_id(player))
        self.has_main_gun = main_gun_applies(getattr(arena(), 'guiType', None))
        self.counts = BattleCounts()
        self.hit_ally = False
        self.settled = False

        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_feedback)
        self.hooks.add(feedback, 'onPlayerSummaryFeedbackReceived', self._on_summary)
        self.hooks.add(battle_messages, 'onShowPlayerMessageByKey', self._on_player_message)
        self.teams.start(self.hooks, player)
        self.render()

    def stop(self):
        self.settle.stop()
        self.teams.stop()
        self.counts = None
        self.row = None

    # onPlayerFeedbackReceived carries only the player's own events (feedback_adaptor, RU 1.45).
    def _on_feedback(self, events):
        if self.counts is None:
            return

        is_changed = self.counts.add('damage', dealt_damage(events))
        for event in events:
            is_changed = self._count(event) or is_changed
        if is_changed:
            self.render()

    def _count(self, event):
        key = self.kinds.get(call(event, 'getBattleEventType'))
        if key is None:
            return False
        if key in ANY_TARGET_KEYS:
            return self.counts.add(key, defence_points(event))
        if not is_enemy(call(event, 'getTargetID')):
            return False
        return self.counts.add(key)

    def _on_summary(self, event):
        if self.counts is None:
            return

        if self.counts.raise_to('damage', call(event, 'getTotalDamage')):
            self.render()

    def _on_player_message(self, key, *args):
        if key == ALLY_HIT_MESSAGE and not self.hit_ally:
            self.hit_ally = True
            self.render()

    def _on_settled(self):
        self.settled = True
        self.render()
        return False

    def _main_gun(self):
        teams = self.teams.teams
        if not self.has_main_gun or teams is None or not teams.vehicles:
            return None
        enemies_max = teams.totals(False)['max']
        enemies_hp = teams.health(False)['hp']
        return main_gun_state(self.counts.values['damage'], enemies_max, enemies_hp, self.hit_ally)

    @safe
    def render(self):
        if self.counts is None:
            return
        main_gun = self._main_gun()
        if main_gun is not None and main_gun['status'] == REACHED and not self.settled:
            self.settle.start()

        state = progress_state(self.counts.values, main_gun, self.row, self.settled)
        rows = progress_rows(state, self.settings, self.app.translate)
        if not rows:
            self.hide()
            return
        self.show(format_panel(rows, self.settings), panel_widget(rows))
