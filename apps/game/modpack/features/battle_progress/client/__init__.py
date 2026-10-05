from __future__ import absolute_import, division, print_function, unicode_literals

from BattleFeedbackCommon import BATTLE_EVENT_TYPE

from ....core.battle_tally import extra_amount
from ....core.client.battle import arena, call, dealt_damage, feedback, is_enemy, shared, summary_assist
from ....core.client.battle.teams import TeamTracker
from ....core.client.game import client_attr, on_vehicle_changed, player_tank_id, values_by_name
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.me import tank_ratings
from ....core.client.timer import Ticker
from ....core.compat import is_number
from ....core.log import safe
from ..i18n import STRINGS
from ..model import BattleCounts, progress_state
from ..model.constants import (
    AMOUNT_KEYS,
    ANY_TARGET_KEYS,
    KIND_BY_EVENT,
    PREVIEW_SIZE,
    RANDOM_BONUS_TYPE,
    REACHED,
    STORE_FILE,
)
from ..model.main_gun import main_gun_state
from ..model.preview import preview_text, preview_widget
from ..model.records import RecordBook, event_values
from ..model.rows import progress_rows
from ..model.text import format_panel
from ..model.widget import panel_widget
from ..settings import PANEL_ID, SCHEMA, SWITCH
from .constants import ALLY_HIT_MESSAGE, CAPS_CLASS, CAPS_MODULE, DOSSIER_CAP, REACHED_BAR_S
from .dossier import selected_records


def battle_messages():
    return shared('messages')


# A battle whose results the dossier's max15x15 records take (random battles, Mapbox and the rest of the
# DOSSIER_MAX15X15 types); only the random battle when the client's caps cannot be read.
def counts_in_dossier(bonus_type):
    caps = client_attr(CAPS_MODULE, CAPS_CLASS)
    cap = getattr(caps, DOSSIER_CAP, None)
    if cap is None or bonus_type is None:
        return bonus_type == RANDOM_BONUS_TYPE

    try:
        return bool(caps.checkAny(bonus_type, cap))
    except Exception:
        return bonus_type == RANDOM_BONUS_TYPE


# RU 1.45 client source: the extra of BASE_CAPTURE_DROPPED is the plain points count
# (feedback_events._unpackInteger), which the defence ribbon shows (ribbons_aggregator._BaseCaptureRibbon).
def defence_points(event):
    extra = call(event, 'getExtra')
    if is_number(extra):
        return extra
    return call(event, 'getCount', 0)


PANEL_SPEC = PanelSpec(
    panel_id=PANEL_ID,
    schema=SCHEMA,
    switch=SWITCH,
    strings=STRINGS,
    preview_size=PREVIEW_SIZE,
    preview_text=preview_text,
    preview_widget=preview_widget,
)


# One plate for this battle's targets. The tank's records come from the own dossier (the selected vehicle), the site's
# career records and the own battle results, and keep being raised after every battle; the tank's site row (WN8,
# expected values) is read in the hangar when the vehicle is selected and kept for the battle.
class BattleProgressPanel(BattlePanel):

    def __init__(self, app):
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, KIND_BY_EVENT)
        self.tanks = tank_ratings(app)
        self.teams = TeamTracker(self.render)
        self.settle = Ticker(REACHED_BAR_S, self._on_settled)
        self.store = None
        self.book = RecordBook()
        self.counts = None
        self.record = {}
        self.row = None
        self.hit_ally = False
        self.settled = False
        BattlePanel.__init__(self, app, PANEL_SPEC)

        app.bus.on('hangar', self._on_vehicle_changed)
        app.bus.on('battle_event', self._on_battle_event)
        self.tanks.listen(self._on_site_row)
        on_vehicle_changed(self._on_vehicle_changed, 'battle progress')
        self.follow_account(self._on_account)

    def _on_account(self, account_id):
        self.store = self.account_file(STORE_FILE, account_id)
        self.book = RecordBook(self.store.read({}))

    def _merge(self, tank_id, values):
        if self.book.merge(tank_id, values) and self.store is not None:
            self.store.write(self.book.to_dict())

    def _on_vehicle_changed(self):
        if not self.enabled_in_hangar():
            return

        tank_id, values = selected_records()
        if tank_id:
            self._merge(tank_id, values)
            self.tanks.ensure(tank_id)

    def _on_site_row(self, tank_id):
        row = self.tanks.row(tank_id)
        if row is not None and row.get('records'):
            self._merge(tank_id, row['records'])

    def _on_battle_event(self, event, now):
        tank_id = (event.get('vehicle') or {}).get('tank_id')
        if tank_id and counts_in_dossier(event.get('bonus_type')):
            self._merge(tank_id, event_values(event))

    def settings_changed(self, changed):
        self.render()

    def extended_changed(self, held):
        self.render()

    def start(self, player):
        tank_id = player_tank_id(player)
        is_counted = counts_in_dossier(getattr(arena(), 'bonusType', RANDOM_BONUS_TYPE))
        self.record = self.book.get(tank_id) if is_counted else {}
        self.row = self.tanks.row(tank_id)
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
        self.record = {}
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
        if key in AMOUNT_KEYS:
            return self.counts.add(key, extra_amount(call(event, 'getExtra')))
        return self.counts.add(key)

    def _on_summary(self, event):
        if self.counts is None:
            return

        is_damage_raised = self.counts.raise_to('damage', call(event, 'getTotalDamage'))
        is_assist_raised = self.counts.raise_to('assist', summary_assist(event))
        if is_damage_raised or is_assist_raised:
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
        if teams is None or not teams.vehicles:
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

        state = progress_state(self.counts.values, main_gun, self.record, self.row, self.settled)
        rows = progress_rows(state, self.settings, self.app.translate, self.extended())
        if not rows:
            self.hide()
            return
        self.show(format_panel(rows, self.settings), panel_widget(rows))
