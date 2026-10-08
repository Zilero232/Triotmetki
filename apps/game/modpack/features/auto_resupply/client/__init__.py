from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.component import FeatureComponent
from ....core.client.game import selected_vehicle
from ....core.log import safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import ACTION_ALL, ACTION_SELECTED, REFUSE_BUSY, plan
from ..settings import SCHEMA, SWITCH
from .garage import garage_vehicles, send, summary


class AutoResupply(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.queue = []
        self.failed = 0
        self.generation = 0
        app.bus.on('account', self._on_account)

    def _on_account(self, *args):
        self.generation += 1
        self.queue = []
        self.failed = 0

    def is_busy(self):
        return bool(self.queue)

    def ui_actions(self):
        if not self.enabled_in_hangar() or self.is_busy():
            return []
        translate = self.app.translate
        return [
            {
                'id': ACTION_SELECTED,
                'label': translate('auto_resupply_apply_selected'),
                'confirm': None,
            },
            {
                'id': ACTION_ALL,
                'label': translate('auto_resupply_apply_all'),
                'confirm': translate('auto_resupply_apply_all_confirm'),
            },
        ]

    def ui_action(self, action, row=None, value=None):
        if not self.enabled_in_hangar() or action not in (ACTION_SELECTED, ACTION_ALL):
            return None
        if self.is_busy():
            return self.notice_error('auto_resupply_refused_%s' % REFUSE_BUSY)

        vehicles = self._vehicles_for(action)
        summaries = [summary(vehicle) for vehicle in vehicles]
        requests, refusal = plan(summaries, self.settings.to_dict())
        if refusal:
            return self.notice_error('auto_resupply_refused_%s' % refusal)

        self._enqueue(vehicles, requests)
        return self.notice_info('auto_resupply_sent', count=len(requests))

    def _vehicles_for(self, action):
        if action == ACTION_ALL:
            return garage_vehicles()
        vehicle = selected_vehicle()
        if vehicle is None:
            return []
        return [vehicle]

    def _enqueue(self, vehicles, requests):
        by_inventory_id = {getattr(vehicle, 'invID', None): vehicle for vehicle in vehicles}
        for inventory_id, flag, flag_value in requests:
            self.queue.append((by_inventory_id[inventory_id], flag, flag_value))

        self.failed = 0
        self._next(self.generation)

    def _next(self, generation):
        if generation != self.generation:
            return
        if not self.queue:
            self._report()
            return

        vehicle, flag, value = self.queue[0]
        send(vehicle, flag, value, safe(lambda success: self._done(generation, success)))

    def _done(self, generation, success):
        if generation != self.generation:
            return

        self.queue.pop(0)
        if not success:
            self.failed += 1

        BigWorld.callback(0, safe(lambda: self._next(generation)))

    def _report(self):
        if self.failed:
            self.app.ui.notify(self.app.translate('auto_resupply_failed'))
