from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import tri_state
from ..settings.constants import FLAGS
from .constants import (  # noqa: F401
    ACTION_ALL,
    ACTION_SELECTED,
    REFUSE_BUSY,
    REFUSE_LOCKED,
    REFUSE_NOTHING,
    REFUSE_UNSET,
)

# Left out: an automatic crew return, RU 1.45 has no such vehicle flag.


def wanted(values):
    result = {}
    for flag in FLAGS:
        value = tri_state(values.get(flag))
        if value is not None:
            result[flag] = value
    return result


def plan_vehicle(vehicle, desired):
    if vehicle.get('locked'):
        return []
    current = vehicle.get('flags') or {}
    changes = []
    for flag in FLAGS:
        is_known = flag in desired and current.get(flag) is not None
        if is_known and current[flag] != desired[flag]:
            changes.append((flag, desired[flag]))
    return changes


def plan(vehicles, values):
    desired = wanted(values)
    if not desired:
        return [], REFUSE_UNSET
    if vehicles and all(vehicle.get('locked') for vehicle in vehicles):
        return [], REFUSE_LOCKED
    requests = []
    for vehicle in vehicles:
        for flag, value in plan_vehicle(vehicle, desired):
            requests.append((vehicle['inv_id'], flag, value))
    if not requests:
        return [], REFUSE_NOTHING
    return requests, None
