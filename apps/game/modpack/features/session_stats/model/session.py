from __future__ import absolute_import, division, print_function, unicode_literals

import uuid

from ....core.compat import is_int, is_number
from .constants import (
    ASSISTED_STATS,
    COUNTERS,
    PENDING_RESULTS_TTL_S,
    RECENT_LIMIT,
    REGULAR_BONUS_TYPE,
    RESULT_COUNTERS,
    RESULTS,
    STAT_COUNTERS,
    VEHICLE_COUNTERS,
)


def _ratio(numerator, denominator, digits=2):
    if not denominator:
        return None
    return round(float(numerator) / denominator, digits)


def _percent(numerator, denominator):
    if not denominator:
        return None
    return round(100.0 * numerator / denominator, 2)


class SessionAggregator(object):

    def __init__(self, idle_seconds=3600, counted_bonus_types=(REGULAR_BONUS_TYPE,)):
        self.idle_seconds = idle_seconds
        self.counted_bonus_types = tuple(counted_bonus_types)
        self.session_id = None
        self.started_at = None
        self.last_activity_at = None
        self.totals = dict.fromkeys(COUNTERS, 0)
        self.vehicles = {}
        self.server = {}
        self.recent = []
        self.pending = {}
        self.discarded = set()

    def _reset(self, now):
        self.session_id = uuid.uuid4().hex
        self.started_at = int(now)
        self.last_activity_at = int(now)
        self.totals = dict.fromkeys(COUNTERS, 0)
        self.vehicles = {}
        self.server = {}
        self.recent = []

    def reset(self, now):
        self.discarded.update(self.pending)
        self.pending = {}

        self._reset(now)

        return self.session_id

    def is_expired(self, now):
        if self.session_id is None:
            return True
        return now - self.last_activity_at > self.idle_seconds

    def touch(self, now):
        if self.is_expired(now):
            self._reset(now)
        else:
            self.last_activity_at = int(now)
        return self.session_id

    def counts(self, battle):
        return battle.get('bonus_type') in self.counted_bonus_types

    def started(self, arena_id, bonus_type, now):
        self.touch(now)

        if not arena_id:
            return
        if bonus_type not in self.counted_bonus_types:
            return

        self.pending[str(arena_id)] = int(now)

    def results_arrived(self, arena_id):
        self.pending.pop(str(arena_id), None)

    def pending_count(self, now):
        oldest_start = now - PENDING_RESULTS_TTL_S
        self.pending = {
            arena_id: started_at
            for arena_id, started_at in self.pending.items()
            if started_at >= oldest_start
        }

        return len(self.pending)

    def _is_discarded(self, arena_id):
        if arena_id not in self.discarded:
            return False

        self.discarded.discard(arena_id)

        return True

    def _remember_result(self, result):
        if result not in RESULTS:
            return

        self.recent.append(result)
        self.recent = self.recent[-RECENT_LIMIT:]

    def add(self, battle, now):
        arena_id = battle.get('arena_unique_id')
        self.results_arrived(arena_id)
        if self._is_discarded(arena_id):
            return None

        session_id = self.touch(now)
        if not self.counts(battle):
            return session_id

        increments = _battle_increments(battle)
        self._add_totals(increments)
        self._add_vehicle(battle.get('vehicle') or {}, increments)
        self._remember_result(battle.get('result'))

        return session_id

    def _add_totals(self, increments):
        for name, value in increments.items():
            if is_number(value):
                self.totals[name] += value

    def _add_vehicle(self, vehicle, increments):
        tank_id = vehicle.get('tank_id')
        if not is_int(tank_id):
            return

        entry = self.vehicles.setdefault(str(tank_id), dict.fromkeys(VEHICLE_COUNTERS, 0))
        for name in VEHICLE_COUNTERS:
            entry[name] += increments[name]

    def set_server_summary(self, session_id, data):
        if session_id != self.session_id or not isinstance(data, dict):
            return False

        self.server = {'wn8': _rounded(data.get('wn8'))}
        return True

    def summary(self, now):
        totals = self.totals
        battles = totals['battles']
        return {
            'session_id': self.session_id,
            'started_at': self.started_at,
            'last_activity_at': self.last_activity_at,
            'battles': battles,
            'wins': totals['wins'],
            'losses': totals['losses'],
            'draws': totals['draws'],
            'win_rate': _percent(totals['wins'], battles),
            'survival_rate': _percent(totals['survived'], battles),
            'avg_damage': _ratio(totals['damage_dealt'], battles, 0),
            'avg_assist': _ratio(totals['damage_assisted'], battles, 0),
            'avg_blocked': _ratio(totals['damage_blocked'], battles, 0),
            'avg_frags': _ratio(totals['frags'], battles),
            'avg_spotted': _ratio(totals['spotted'], battles),
            'avg_xp': _ratio(totals['xp'], battles, 0),
            'credits_total': totals['credits'],
            'hit_rate': _percent(totals['direct_enemy_hits'], totals['shots']),
            'pen_rate': _percent(totals['piercing_enemy_hits'], totals['direct_enemy_hits']),
            'wn8': self.server.get('wn8'),
            'vehicles': _copy_vehicles(self.vehicles),
            'recent': list(self.recent),
            'pending': self.pending_count(now),
        }

    def to_dict(self):
        return {
            'session_id': self.session_id,
            'started_at': self.started_at,
            'last_activity_at': self.last_activity_at,
            'totals': dict(self.totals),
            'vehicles': _copy_vehicles(self.vehicles),
            'server': dict(self.server),
            'recent': list(self.recent),
        }

    def load(self, data):
        if not _is_saved_session(data):
            return False

        self.session_id = data['session_id']
        self.started_at = data['started_at']
        self.last_activity_at = data['last_activity_at']
        self.totals = _known_totals(data.get('totals') or {})
        self.vehicles = dict(data.get('vehicles') or {})
        self.server = dict(data.get('server') or {})
        self.recent = _known_results(data.get('recent'))
        return True


def _battle_increments(battle):
    stats = battle.get('stats') or {}
    result = battle.get('result')

    increments = {name: stats.get(name, 0) for name in STAT_COUNTERS}
    increments.update({counter: int(result == key) for key, counter in RESULT_COUNTERS.items()})
    increments.update({
        'battles': 1,
        'survived': 1 if stats.get('is_alive') else 0,
        'damage_assisted': sum(stats.get(name, 0) for name in ASSISTED_STATS),
    })

    return increments


def _rounded(value):
    if not is_number(value):
        return None
    return round(float(value), 0)


def _is_saved_session(data):
    if not isinstance(data, dict) or not data.get('session_id'):
        return False
    return is_int(data.get('started_at')) and is_int(data.get('last_activity_at'))


def _copy_vehicles(vehicles):
    return {tank_id: dict(entry) for tank_id, entry in vehicles.items()}


def _known_totals(totals):
    known = dict.fromkeys(COUNTERS, 0)
    for name in COUNTERS:
        value = totals.get(name, 0)
        if is_number(value):
            known[name] = value
    return known


def _known_results(values):
    if not isinstance(values, list):
        return []

    known = [result for result in values if result in RESULTS]

    return known[-RECENT_LIMIT:]
