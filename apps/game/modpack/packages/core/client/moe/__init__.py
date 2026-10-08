"""The marks-of-excellence data the marks views share: the site curve and the mastery badges' XP per
tank (GET /v1/moe/<tank_id>, cached) and the pace of the player's own last battles per tank (kept per account in the
app state). One instance per process (`moe_service(app)`), so the in-battle panel and the hangar view read each
curve once."""
from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ...codec import parse_json_body
from ...events import Listeners
from ...log import log, safe
from ...moe import PaceBook, ThresholdCache, ThresholdCurve, mastery_from_api, threshold_problem
from ...net.signing import DEVICE_HEADER
from .constants import MOE_PATH, NO_THRESHOLDS, STATE_KEY

_state = {'service': None}


class MoeService(object):

    def __init__(self, app):
        self.app = app
        self.cache = ThresholdCache()
        self.masteries = {}
        self.pace_book = PaceBook()
        self.listeners = Listeners('marks data listener')
        app.register_account_state(STATE_KEY, self._dump_pace, self._load_pace)
        app.bus.on('vehicle_moe', self._on_vehicle_moe)
        app.bus.on('battle_event', self._on_battle_event)

    def listen(self, callback):
        self.listeners.add(callback)

    def snapshot(self, tank_id):
        return self.app.marks.hangar_moe.get(tank_id)

    def curve(self, tank_id):
        return self.cache.get(tank_id)

    def mastery(self, tank_id):
        return self.masteries.get(tank_id)

    def pace(self, tank_id):
        return self.pace_book.pace(tank_id)

    def _dump_pace(self):
        return self.pace_book.to_dict()

    def _load_pace(self, stored):
        self.pace_book = PaceBook(stored)

    def _on_vehicle_moe(self, snapshot):
        self.ensure(snapshot.get('tank_id'))

    def _on_battle_event(self, event, now):
        self.pace_book.record_event(event)

    def ensure(self, tank_id):
        if tank_id is None or not self.cache.due(tank_id, time.time()):
            return False
        app = self.app
        self.cache.begin(tank_id)
        headers = {'Accept': 'application/json', 'User-Agent': app.user_agent()}
        creds = app.current_credentials()
        if creds is not None:
            headers[DEVICE_HEADER] = creds.device_id

        @safe
        def done(status, body, response_headers):
            data = parse_json_body(body)
            curve = ThresholdCurve.from_api(data) if status == 200 else None
            self.cache.store(tank_id, curve, time.time())
            problem = threshold_problem(status, data, curve)
            if problem is not None:
                log(NO_THRESHOLDS % (tank_id, problem))
            if status == 200:
                self.masteries[tank_id] = mastery_from_api(data)
            self.listeners.notify(tank_id)

        app.transport.request('GET', app.config.endpoint(MOE_PATH % tank_id), headers, None, done)
        return True


def moe_service(app):
    """The process-wide marks data (created on first use, so features need no load order)."""
    if _state['service'] is None or _state['service'].app is not app:
        _state['service'] = MoeService(app)
    return _state['service']
