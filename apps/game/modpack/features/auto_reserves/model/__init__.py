from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, is_number
from ..settings.constants import RESERVES, WHEN_EXPIRY
from .constants import (  # noqa: F401
    ACTION_ACTIVATE,
    CHECK_EVERY_S,
    MAX_ACTIVE,
    NO_EXPIRY,
    REFUSE_FULL,
    REFUSE_NOTHING,
    REFUSE_UNSET,
)

KINDS = tuple(kind for kind, _key in RESERVES)


def wanted_kinds(values):
    return [kind for kind, key in RESERVES if values.get(key)]


def clean_booster(raw):
    if not isinstance(raw, dict) or raw.get('kind') not in KINDS:
        return None
    booster_id = raw.get('id')
    if not is_int(booster_id):
        return None
    value = raw.get('value')
    expires = raw.get('expires')
    return {
        'id': booster_id,
        'kind': raw['kind'],
        'active': bool(raw.get('active')),
        'ready': bool(raw.get('ready')),
        'value': value if is_number(value) else 0,
        'expires': expires if is_int(expires) and expires > 0 else NO_EXPIRY,
    }


def _best(candidates):
    return min(candidates, key=lambda booster: (-booster['value'], booster['expires'], booster['id']))


def pick(boosters, values):
    kinds = wanted_kinds(values)
    if not kinds:
        return [], REFUSE_UNSET
    cleaned = [booster for booster in (clean_booster(raw) for raw in boosters or ()) if booster]
    active_kinds = set(booster['kind'] for booster in cleaned if booster['active'])
    free = free_slots(boosters)
    picks = []
    is_full = False
    for kind in kinds:
        candidates = [booster for booster in cleaned if booster['kind'] == kind and booster['ready']]
        if kind in active_kinds or not candidates:
            continue
        if len(picks) >= free:
            is_full = True
            break
        picks.append(_best(candidates)['id'])
    if picks:
        return picks, None
    return [], REFUSE_FULL if is_full else REFUSE_NOTHING


def free_slots(boosters):
    active_count = 0
    for raw in boosters or ():
        is_active = isinstance(raw, dict) and bool(raw.get('active'))
        if is_active:
            active_count += 1

    return max(MAX_ACTIVE - active_count, 0)


def is_slot_freed(boosters, free_at_refusal):
    if free_at_refusal is None:
        return False

    return free_slots(boosters) > free_at_refusal


def is_due(values, now, checked_at, session_done):
    if not session_done:
        return True
    return values.get('when') == WHEN_EXPIRY and now - checked_at >= CHECK_EVERY_S
