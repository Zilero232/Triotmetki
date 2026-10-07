from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, is_number
from .constants import MAX_BATTLE_DELTA


def _is_possible(data):
    battles = data.get('battles') if is_int(data.get('battles')) else 1
    return abs(data['change']) <= MAX_BATTLE_DELTA * max(1, battles)


def _entry(data):
    if not isinstance(data, dict) or not is_number(data.get('change')) or not is_int(data.get('order')):
        return None
    if not is_int(data.get('tank_id')) or not _is_possible(data):
        return None
    return {
        'tank_id': data['tank_id'],
        'change': round(float(data['change']), 2),
        'percent': data.get('percent') if is_number(data.get('percent')) else None,
        'battles': data.get('battles') if is_int(data.get('battles')) else 1,
        'order': data['order'],
    }


class SessionMoe(object):

    def __init__(self, data=None):
        self.session_id = None
        self.tanks = {}
        self.counter = 0
        self.load(data)

    def load(self, data):
        if not isinstance(data, dict):
            return
        tanks = data.get('tanks') if isinstance(data.get('tanks'), dict) else {}
        self.session_id = data.get('session_id')
        entries = ((key, _entry(value)) for key, value in tanks.items())
        self.tanks = {key: entry for key, entry in entries if entry}
        self.counter = max([entry['order'] for entry in self.tanks.values()] or [0])

    def to_dict(self):
        return {'session_id': self.session_id, 'tanks': {key: dict(entry) for key, entry in self.tanks.items()}}

    def add(self, session_id, tank_id, change, percent):
        if session_id != self.session_id:
            self.session_id = session_id
            self.tanks = {}
        if not session_id or not is_number(change) or not is_int(tank_id):
            return False
        entry = self.tanks.setdefault(str(tank_id), {'tank_id': tank_id, 'change': 0.0, 'percent': None, 'battles': 0})
        self.counter += 1
        entry.update({
            'change': round(entry['change'] + change, 2),
            'percent': percent,
            'battles': entry['battles'] + 1,
            'order': self.counter,
        })
        return True

    def rows(self, session_id, limit):
        if not session_id or session_id != self.session_id:
            return []
        newest = sorted(self.tanks.values(), key=lambda entry: -entry['order'])
        return [dict(entry) for entry in newest[:limit]]


def signed_change(change):
    return u'%+.2f%%' % change


def change_tone(change):
    if change > 0:
        return 'good'
    return 'bad' if change < 0 else 'muted'
