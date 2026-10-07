# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_int, is_number

# Fair play: the selected tank's own research tree and own dossier average XP.


def _locked(info):
    return {node['id']: node for node in info.get('nodes') or ()}


def _with_prerequisites(node_id, locked, seen=None):
    seen = set() if seen is None else seen
    if node_id in seen or node_id not in locked:
        return seen
    seen.add(node_id)
    for required in locked[node_id].get('required') or ():
        _with_prerequisites(required, locked, seen)
    return seen


def _remaining(cost, info):
    return max(0, int(cost) - int(info.get('xp') or 0))


def battles_left(need, avg_xp):
    if not is_int(need) or need <= 0:
        return 0
    if not is_number(avg_xp) or avg_xp <= 0:
        return None
    return int(math.ceil(need / float(avg_xp)))


def to_elite(info):
    if info.get('elite'):
        return None
    locked = _locked(info)
    if not locked:
        return None
    return _remaining(sum(node['cost'] for node in locked.values()), info)


def next_vehicles(info):
    locked = _locked(info)
    rows = []
    for node in locked.values():
        if not node.get('vehicle'):
            continue
        path = _with_prerequisites(node['id'], locked)
        need = _remaining(sum(locked[node_id]['cost'] for node_id in path), info)
        rows.append({'id': node['id'], 'name': node['name'], 'tier': node.get('tier'), 'need': need})
    return sorted(rows, key=lambda row: (row['need'], row['name']))


def research_state(info):
    if not isinstance(info, dict):
        return None
    elite = to_elite(info)
    vehicles = next_vehicles(info)
    if elite is None and not vehicles:
        return None
    avg_xp = info.get('avg_xp')
    for row in vehicles:
        row['battles'] = battles_left(row['need'], avg_xp)
    return {
        'xp': int(info.get('xp') or 0),
        'elite': elite,
        'elite_battles': battles_left(elite, avg_xp) if elite is not None else None,
        'vehicles': vehicles,
    }
