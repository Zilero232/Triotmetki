from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import map_label
from ....core.client.component import FeatureComponent
from ....core.events import EVENT_HIT_VIEWER_OPEN, hit_viewer_battles
from ..i18n import STRINGS
from ..model import build_page, build_summary, compact, counts, format_summary, page_actions, restore_history
from ..model.constants import ACTION_CLEAR, ACTION_HITS, STATE_KEY
from ..settings import SCHEMA, SECTION, SWITCH
from .hits import HitRecorder
from .last_battle import LastBattlePanel
from .summary import BattleSummaryPanel


class BattleResultsSummary(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.pending = []
        self.history = restore_history(app.state.get(STATE_KEY))
        app.register_state(STATE_KEY, lambda: self.history)
        self.hits = HitRecorder(self)
        self.summary_card = BattleSummaryPanel(app)
        self.last_battle = LastBattlePanel(app)
        app.bus.on('battle_event', self._on_battle_event)
        app.bus.on('hangar', self._on_hangar)

    def settings_changed(self, changed):
        if 'hits_keep_battles' in changed:
            self.hits.resize()

    def _on_battle_event(self, event, now):
        if not self.enabled():
            return

        summary = self._summary_of(event)
        if not counts(summary, self.settings.get('bonus_types')):
            return

        self._remember(summary)
        if self.app.in_battle:
            self.last_battle.offer(summary)
        self._announce(format_summary(summary, self.settings, self.app.translate))

    def _summary_of(self, event):
        tank_id = (event.get('vehicle') or {}).get('tank_id')
        moe_before = self.app.marks.before_battle(event.get('arena_unique_id'), tank_id) or {}
        return build_summary(event, moe_before, map_label(event.get('arena_type_id')))

    def _remember(self, summary):
        self.history.append(compact(summary))
        del self.history[:-self.settings.get('history_size')]

    def _announce(self, text):
        if self.app.in_battle:
            self.pending.append(text)
        else:
            self.app.ui.notify(text)

    def _on_hangar(self):
        while self.pending:
            self.app.ui.notify(self.pending.pop(0))

    def ui_actions(self):
        if not self.enabled():
            return []
        return page_actions(self.app.translate)

    def ui_page(self):
        if not self.enabled():
            return None
        idle_s = self.app.config.get('session_idle_minutes') * 60
        hit_battles = self.hits.battles() if self.settings.get('hits_tab') else ()
        return build_page(
            self.history,
            self.app.translate,
            idle_s,
            hit_battles=hit_battles,
            show_attacker=self.settings.get('hits_show_attacker'),
            viewer_battles=hit_viewer_battles(self.app.bus),
        )

    def ui_action(self, action, row=None, value=None):
        if action == ACTION_HITS:
            self.app.bus.emit(EVENT_HIT_VIEWER_OPEN, row)
            return None
        if action != ACTION_CLEAR:
            return None
        self.history = []
        self.app.save_state()
        self.hits.clear()
        return self.notice_info('br_cleared')
