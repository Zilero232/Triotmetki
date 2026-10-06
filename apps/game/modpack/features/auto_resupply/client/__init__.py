from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.client.game import selected_vehicle
from ....core.log import safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import ACTION_ALL, ACTION_SELECTED, plan
from ..settings import SCHEMA, SWITCH
from .garage import garage_vehicles, send, summary


class AutoResupply(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.queue = []
        self.failed = 0

    def ui_actions(self):
        if not self.enabled_in_hangar():
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
        vehicles = self._vehicles_for(action)
        requests, refusal = plan([summary(vehicle) for vehicle in vehicles], self.settings.to_dict())
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
        was_idle = not self.queue
        for inventory_id, flag, flag_value in requests:
            self.queue.append((by_inventory_id[inventory_id], flag, flag_value))
        if was_idle:
            self.failed = 0
            self._next()

    def _next(self):
        if not self.queue:
            if self.failed:
                self.app.ui.notify(self.app.translate('auto_resupply_failed'))
            return
        vehicle, flag, value = self.queue[0]
        send(vehicle, flag, value, self._done)

    @safe
    def _done(self, success):
        if self.queue:
            self.queue.pop(0)
        if not success:
            self.failed += 1
        self._next()
