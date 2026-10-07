from __future__ import absolute_import, division, print_function, unicode_literals

import json

from ....core.compat import is_int
from .constants import ADVICE_PATH, CACHE_TTL_S, KINDS, PAYLOAD_VERSION, RETRY_AFTER_S

# Fair play: the site's public build of the own tank, hangar only; the request names only the tank.


def advice_path(tank_id):
    return ADVICE_PATH % tank_id


def _ids(values):
    if not isinstance(values, list):
        return []
    return [value for value in values if is_int(value) and value > 0]


def parse_advice(data, tank_id):
    if not isinstance(data, dict) or data.get('tankId') != tank_id:
        return None
    if not data.get('isEnough'):
        return {kind: [] for kind in KINDS}
    return {kind: _ids(data.get(kind)) for kind in KINDS}


def advised_ids(advice, values):
    found = []
    for kind in KINDS:
        if advice and values.get(kind):
            found.extend(item for item in advice.get(kind, ()) if item not in found)
    return found


def page_payload(tank_id, items, label):
    body = {'v': PAYLOAD_VERSION, 'tankId': tank_id or 0, 'items': list(items), 'label': label}
    return json.dumps(body, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


class AdviceCache(object):
    def __init__(self, ttl=CACHE_TTL_S, retry_after=RETRY_AFTER_S):
        self.ttl = ttl
        self.retry_after = retry_after
        self.entries = {}
        self.asked = {}

    def get(self, tank_id):
        entry = self.entries.get(tank_id)
        return entry[1] if entry is not None else None

    def is_due(self, tank_id, now):
        entry = self.entries.get(tank_id)
        if entry is not None and now - entry[0] < self.ttl:
            return False
        asked = self.asked.get(tank_id)
        return asked is None or now - asked >= self.retry_after

    def asking(self, tank_id, now):
        self.asked[tank_id] = now

    def put(self, tank_id, advice, now):
        self.entries[tank_id] = (now, advice)
