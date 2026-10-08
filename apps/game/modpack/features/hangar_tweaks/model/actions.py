from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import REFUSE_BERTHS, REFUSE_LOCKED, REFUSE_NOTHING


def plan_demount(vehicle):
    if vehicle.get('locked'):
        return [], REFUSE_LOCKED
    devices = vehicle.get('devices') or []
    planned = [device for device in devices if device and device.get('removable')]
    if not planned:
        return [], REFUSE_NOTHING
    return planned, None


def is_still_planned(planned, current):
    if current is None:
        return False
    if not current.get('removable'):
        return False
    return current.get('int_cd') == planned.get('int_cd')


def plan_crew_unload(vehicle, free_berths):
    if vehicle.get('locked'):
        return 0, REFUSE_LOCKED
    count = int(vehicle.get('crew') or 0)
    if count <= 0:
        return 0, REFUSE_NOTHING
    if free_berths is not None and free_berths < count:
        return 0, REFUSE_BERTHS
    return count, None


def plan_style_removal(vehicle):
    if vehicle.get('locked'):
        return REFUSE_LOCKED
    if not vehicle.get('style'):
        return REFUSE_NOTHING
    return None


def plan_crew_return(vehicle):
    if vehicle.get('locked'):
        return REFUSE_LOCKED
    if not vehicle.get('last_crew'):
        return REFUSE_NOTHING
    return None
