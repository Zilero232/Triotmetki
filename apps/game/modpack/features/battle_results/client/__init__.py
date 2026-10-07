from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.game import map_label
from ....core.client.component import FeatureComponent
from ....core.events import EVENT_HIT_VIEWER_OPEN, battle_notice_lines, hit_viewer_battles
from ..i18n import STRINGS
from ..model import (
    APPEND,
    PUSH,
    StockNotices,
    build_page,
    build_summary,
    compact,
    counts,
    format_summary,
    page_actions,
    restore_history,
    stock_lines,
    trimmed,
)
from ..model.constants import ACTION_CLEAR, ACTION_HITS, STATE_KEY
from ..settings import SCHEMA, SECTION, SWITCH
from .hits import HitRecorder
from .last_battle import LastBattlePanel
from .stock_message import StockMessageHook, appended


class BattleResultsSummary(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.pending = []
        self.history = []
        app.register_account_state(STATE_KEY, lambda: self.history, self._load_history)
        self.hits = HitRecorder(self)
        self.last_battle = LastBattlePanel(app)
        self.notices = StockNotices()
        self.stock_hook = StockMessageHook(self._on_stock_message)
        self.recorded = []
        app.bus.on('battle_event', self._on_battle_event)
        app.bus.on('battle_recorded', self._on_battle_recorded)
        app.bus.on('hangar', self._on_hangar)
        app.bus.on('battle_enter', self._on_battle_enter)
        app.bus.on('tick', self._on_tick)

    def _load_history(self, stored):
        self.history = restore_history(stored)

    def settings_changed(self, changed):
        if 'history_size' in changed:
            self.history = trimmed(self.history, self.settings.get('history_size'))
            self.app.save_state()

    def _on_battle_event(self, event, now):
        if not self.enabled():
            return

        summary = self._summary_of(event)
        if not counts(summary, self.settings.get('bonus_types')):
            return

        self._remember(summary)
        if self.app.in_battle:
            self.last_battle.offer(summary)
        self.recorded.append(summary)

    def _summary_of(self, event):
        tank_id = (event.get('vehicle') or {}).get('tank_id')
        moe_before = self.app.marks.before_battle(event.get('arena_unique_id'), tank_id) or {}
        return build_summary(event, moe_before, map_label(event.get('arena_type_id')))

    def _remember(self, summary):
        self.history = trimmed(self.history + [compact(summary)], self.settings.get('history_size'))

    def _on_battle_recorded(self):
        while self.recorded:
            self._offer_notice(self.recorded.pop(0))

    def _offer_notice(self, summary):
        if not self.stock_hook.installed:
            self._announce(summary)
            return
        action, deliver = self.notices.results_arrived(summary.get('arena'), summary)
        if action == APPEND:
            deliver(self._stock_lines(summary))
        elif action == PUSH:
            self._announce(summary)

    def _on_stock_message(self, arena, messages, callback):
        def deliver(lines):
            callback(appended(messages, arena, lines))

        if not self.enabled():
            callback(messages)
            return
        summary = self.notices.stock_arrived(arena, deliver, time.time())
        if summary is not None:
            deliver(self._stock_lines(summary))

    def _stock_lines(self, summary):
        own = stock_lines(summary, self.settings, self.app.translate)
        return own + battle_notice_lines(self.app.bus, summary.get('arena'))

    def _announce(self, summary):
        text = format_summary(summary, self.settings, self.app.translate)
        if self.app.in_battle:
            self.pending.append(text)
        else:
            self.app.ui.notify(text)

    def _on_hangar(self):
        self.notices.entered_hangar(time.time())
        while self.pending:
            self.app.ui.notify(self.pending.pop(0))

    def _on_battle_enter(self):
        self.notices.left_hangar()

    def _on_tick(self, now):
        delivers, unclaimed = self.notices.expired(now)
        for deliver in delivers:
            deliver([])
        for summary in unclaimed:
            self._announce(summary)

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
