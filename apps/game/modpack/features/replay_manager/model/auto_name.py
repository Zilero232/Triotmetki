from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.compat import as_int, is_int, to_text
from ....core.replay_file import same_vehicle
from ....core.templates import render
from .constants import AUTO_NAME_GIVE_UP_S, AUTO_NAME_MATCH_S, AUTO_NAME_SETTLE_S, EXACT_MATCH
from .errors import ReplayActionError
from .names import rename_target


def name_values(event, map_label, vehicle_label, result_label):
    moment = time.localtime(event.get('arena_created_at') or event.get('occurred_at') or 0)
    stats = event.get('stats') or {}
    vehicle = event.get('vehicle') or {}
    return {
        'date': to_text(time.strftime('%Y-%m-%d', moment)),
        'time': to_text(time.strftime('%H-%M', moment)),
        'map': map_label or event.get('map_name') or u'',
        'vehicle': vehicle_label or u'',
        'tier': vehicle.get('tier') or u'',
        'result': result_label or u'',
        'damage': as_int(stats.get('damage_dealt')),
        'xp': as_int(stats.get('xp')),
        'frags': as_int(stats.get('frags')),
        'arena': event.get('arena_unique_id') or u'',
    }


def render_name(template, values, old_name):
    plain = {key: str(value) if is_int(value) else value for key, value in values.items()}
    try:
        return rename_target(old_name, render(template, plain))
    except ReplayActionError:
        return None


class AutoNamer(object):

    def __init__(self):
        self.pending = []

    def queue(self, event, values, now, vehicle=None):
        arena = event.get('arena_unique_id')
        if not arena or self._is_queued(arena):
            return False

        started = event.get('arena_created_at') or event.get('occurred_at')
        item = {'arena': arena, 'started': started, 'vehicle': vehicle, 'values': values, 'queued': now}
        self.pending.append(item)
        return True

    def _is_queued(self, arena):
        return any(item['arena'] == arena for item in self.pending)

    def plan(self, replays, template, now):
        renames = []
        keep = []
        for item in self.pending:
            replay = _replay_of(item, replays)
            if _is_waiting(item, replay, now):
                keep.append(item)
                continue
            if replay is None:
                continue
            name = render_name(template, item['values'], replay['name'])
            if name and name != replay['name']:
                renames.append((replay, name))

        self.pending = keep
        return renames


def _closeness(item, replay):
    header = replay.get('header') or {}
    if not same_vehicle(header.get('vehicle'), item.get('vehicle')):
        return None
    if header.get('arena_unique_id'):
        is_same_arena = to_text(header['arena_unique_id']) == to_text(item['arena'])
        return EXACT_MATCH if is_same_arena else None

    started = header.get('date_time')
    if started is None or item['started'] is None:
        return None
    distance = abs(started - item['started'])
    return distance if distance <= AUTO_NAME_MATCH_S else None


def _replay_of(item, replays):
    best = None
    best_closeness = None
    for replay in replays:
        closeness = _closeness(item, replay)
        if closeness is None:
            continue
        if best is None or closeness < best_closeness:
            best = replay
            best_closeness = closeness
    return best


def _is_waiting(item, replay, now):
    if replay is None:
        return now - item['queued'] < AUTO_NAME_GIVE_UP_S
    return now - replay['mtime'] < AUTO_NAME_SETTLE_S
