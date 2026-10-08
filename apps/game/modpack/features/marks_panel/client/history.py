from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.game import vehicle_class_tag, vehicle_short_name
from ....core.log import log
from ....core.storage import account_file
from ..model.constants import ACTION_CLEAR, HISTORY_FILE, LOG_REJECTED, LOG_REPAIRED
from ..model.history import MarksHistory
from ..model.page import build_page, page_actions


class HistoryBook(object):

    def __init__(self, app, settings, is_enabled):
        self.app = app
        self.settings = settings
        self.is_enabled = is_enabled
        self.history = None
        bus = app.bus
        bus.on('account', self._on_account)
        bus.on('battle_event', self._on_battle_event)
        if app.account_id:
            self._on_account(app.account_id)

    def _on_account(self, account_id):
        self.history = None
        store = account_file(self.app.config_dir, HISTORY_FILE, account_id)
        self.history = MarksHistory(store, self.settings.get('max_entries'))
        if self.history.repaired:
            log(LOG_REPAIRED % self.history.repaired)
            self.history.save()

    def is_open(self):
        return self.history is not None and self.is_enabled()

    def _on_battle_event(self, event, now):
        if not self.is_open():
            return
        tank_id = (event.get('vehicle') or {}).get('tank_id')
        before = (self.app.marks.before_battle(event.get('arena_unique_id'), tank_id) or {}).get('damage_rating')
        label = vehicle_short_name(tank_id)
        if self.history.record_battle(event, label, vehicle_class_tag(tank_id), before) is not None:
            self.history.save()
        elif self.history.rejected:
            log(LOG_REJECTED % (tank_id, self.history.rejected))

    def record_snapshot(self, snapshot):
        if not self.is_open():
            return
        tank_id = snapshot.get('tank_id')
        label = vehicle_short_name(tank_id)
        entry = self.history.record_snapshot(snapshot, time.time(), label, vehicle_class_tag(tank_id))
        if entry is not None:
            self.history.save()

    def last_reading(self, tank_id):
        if self.history is None or not tank_id:
            return None
        return self.history.last_reading(tank_id)

    def summary(self, tank_id):
        if not self.is_open() or not tank_id:
            return None
        return self.history.summary(tank_id, self.settings.get('trend_battles'))

    def actions(self):
        return page_actions(self.app.translate) if self.is_open() else []

    def page(self):
        if not self.is_open():
            return None
        settings = self.settings
        return build_page(self.history, self.app.translate, settings.get('trend_battles'), settings.get('page_rows'))

    def clear(self, action, row):
        if action != ACTION_CLEAR or self.history is None or not row:
            return False
        if self.history.clear(row):
            self.history.save()
        return True
