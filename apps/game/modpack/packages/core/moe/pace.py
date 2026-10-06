from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import as_int, is_int, is_number
from .ema import combined_damage
from .constants import PACE_BATTLES, PACE_MIN, PACE_TANKS


def battle_combined(event):
    if not isinstance(event, dict):
        return None
    tank_id = (event.get('vehicle') or {}).get('tank_id')
    stats = event.get('stats') or {}
    if not is_int(tank_id) or not is_number(stats.get('damage_dealt')):
        return None
    combined = combined_damage(
        as_int(stats.get('damage_dealt')),
        as_int(stats.get('damage_assisted_radio')),
        as_int(stats.get('damage_assisted_track')),
        as_int(stats.get('damage_assisted_stun')),
    )
    return tank_id, event.get('arena_unique_id'), combined


def _is_row(row):
    return isinstance(row, list) and len(row) == 2 and is_number(row[1])


class PaceBook(object):

    def __init__(self, data=None, keep=PACE_BATTLES):
        self.keep = keep
        self.tanks = {}
        for key, rows in (data if isinstance(data, dict) else {}).items():
            cleaned = [[row[0], int(row[1])] for row in rows or [] if _is_row(row)]
            if cleaned:
                self.tanks[str(key)] = cleaned[-keep:]

    def record(self, tank_id, arena, combined):
        if not is_int(tank_id) or not is_number(combined) or combined < 0:
            return False
        rows = self.tanks.setdefault(str(tank_id), [])
        if arena is not None and any(row[0] == arena for row in rows):
            return False
        rows.append([arena, int(combined)])
        del rows[:-self.keep]
        self._forget_other_tanks(str(tank_id))
        return True

    def _forget_other_tanks(self, kept):
        while len(self.tanks) > PACE_TANKS:
            oldest = next(key for key in self.tanks if key != kept)
            del self.tanks[oldest]

    def record_event(self, event):
        found = battle_combined(event)
        return self.record(*found) if found is not None else False

    def battles(self, tank_id):
        return len(self.tanks.get(str(tank_id)) or [])

    def pace(self, tank_id):
        rows = self.tanks.get(str(tank_id)) or []
        if len(rows) < PACE_MIN:
            return None
        return float(sum(row[1] for row in rows)) / len(rows)

    def to_dict(self):
        return {key: [list(row) for row in rows] for key, rows in self.tanks.items()}
