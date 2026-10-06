from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import is_int, is_number
from .constants import EXPECTED_FIELDS, MAX_MARKS, MAX_MASTERY, RATING_TIERS, RECORD_FIELDS, TANK_RATINGS


def number(value, low=None, high=None):
    """`value` as a float within [low, high], else None."""
    if not is_number(value):
        return None
    if low is not None and value < low:
        return None
    if high is not None and value > high:
        return None
    return float(value)


def count(value, high=None):
    """`value` as a non-negative int up to `high`, else None."""
    if not is_int(value) or value < 0 or (high is not None and value > high):
        return None
    return int(value)


def rating(value):
    """{value, tier} of a rating on the site's scale; an unknown tier is None."""
    if not isinstance(value, dict):
        return {'value': None, 'tier': None}
    tier = value.get('tier')
    return {'value': number(value.get('value')), 'tier': tier if tier in RATING_TIERS else None}


def stats(data, ratings):
    """battles, win_rate, avg_damage and the named ratings of one answer row."""
    parsed = {
        'battles': count(data.get('battles')) or 0,
        'win_rate': number(data.get('win_rate'), 0, 100),
        'avg_damage': number(data.get('avg_damage'), 0),
    }
    for key in ratings:
        parsed[key] = rating(data.get(key))
    return parsed


def owned(data, account_id):
    """Fair play: an answer about any account other than the bound one is dropped, even if the server sent it."""
    return isinstance(data, dict) and account_id is not None and data.get('account_id') == account_id


def records(value):
    """The career records of a tank ({damage, assist, frags, xp}, each None when unknown), or None."""
    if not isinstance(value, dict):
        return None
    parsed = {key: count(value.get(name)) for key, name in RECORD_FIELDS}
    return parsed if any(item is not None for item in parsed.values()) else None


def expected(value):
    """The WN8 expected values of a tank ({damage, spot, frag, def, win_rate}), or None unless all are usable."""
    if not isinstance(value, dict):
        return None
    parsed = {key: number(value.get(name), 0) for key, name in EXPECTED_FIELDS}
    if any(item is None for item in parsed.values()) or not parsed['damage'] or not parsed['win_rate']:
        return None
    return parsed


def tank_rows(data, account_id, ratings=TANK_RATINGS):
    """{tank_id: row} of a /mod/me/tanks answer for the bound account; {} for anything else."""
    if not owned(data, account_id) or not isinstance(data.get('tanks'), list):
        return {}
    rows = {}
    for item in data['tanks']:
        tank_id = item.get('tank_id') if isinstance(item, dict) else None
        if not is_int(tank_id) or tank_id <= 0:
            continue
        row = stats(item, ratings)
        row.update({
            'tank_id': int(tank_id),
            'moe_percent': number(item.get('moe_percent'), 0, 100),
            'marks_on_gun': count(item.get('marks_on_gun'), MAX_MARKS),
            'mastery': count(item.get('mastery'), MAX_MASTERY) or 0,
            'records': records(item.get('records')),
            'expected': expected(item.get('expected')),
        })
        rows[int(tank_id)] = row
    return rows
