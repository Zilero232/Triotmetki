# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int
from ....core.hud.icons import class_icon, flag_icon, mark_icon, tier_icon
from .constants import (
    NATION_BITS_MASK,
    NATION_BITS_SHIFT,
    NATION_NAMES,
    REPORT_BATTLES,
    REPORT_CHART,
    REPORT_TRENDS,
    SOURCE_BATTLE,
)
from .history import percent, rating_delta, start_of

# Fair play: only the player's own marks history, nothing is read about anyone else.


# The nation of a vehicle compact descriptor (items.parseIntCompactDescr, RU 1.45: bits 4-7).
def nation_of(tank_id):
    if not is_int(tank_id):
        return None
    index = (tank_id >> NATION_BITS_SHIFT) & NATION_BITS_MASK
    if index >= len(NATION_NAMES):
        return None
    return NATION_NAMES[index]


def _battle_row(before, entry):
    return {
        't': entry.get('t'),
        'damage': entry.get('combined'),
        'percent': percent(entry.get('rating')),
        'delta': rating_delta(before, entry),
        'result': entry.get('result'),
    }


def battle_rows(entries):
    rows = []
    for index, entry in enumerate(entries):
        if entry.get('source') != SOURCE_BATTLE:
            continue
        rows.append(_battle_row(start_of(entries, index), entry))
    return list(reversed(rows))


def trend(rows, count):
    window = [row['delta'] for row in rows[:count] if row['delta'] is not None]
    delta = round(sum(window), 2) if window else None
    return {'battles': len(window), 'delta': delta}


def best(rows):
    scored = [row for row in rows if is_int(row.get('damage'))]
    if not scored:
        return None
    return max(scored, key=lambda row: row['damage'])


def _percents(entries):
    values = [percent(entry.get('rating')) for entry in entries]
    return [value for value in values if value is not None]


def _int_or(value, fallback):
    return value if is_int(value) else fallback


def marks_report(tank_id, vehicle):
    entries = vehicle.get('entries') or []
    if not entries:
        return None
    last = entries[-1]
    rows = battle_rows(entries)
    percents = _percents(entries)
    tier = vehicle.get('tier')

    return {
        'name': vehicle.get('label') or u'',
        'tier': _int_or(tier, None),
        'tier_icon': tier_icon(tier),
        'flag': flag_icon(nation_of(tank_id)),
        'cls': class_icon(vehicle.get('class')),
        'percent': percent(last.get('rating')),
        'marks': _int_or(last.get('marks'), 0),
        'mark': mark_icon(last.get('marks')),
        'avg': _int_or(last.get('avg'), None),
        'last': rows[0] if rows else None,
        'best': best(rows),
        'record': max(percents) if percents else None,
        'trends': [dict(trend(rows, count), window=count) for count in REPORT_TRENDS],
        'battles': rows[:REPORT_BATTLES],
        'chart': _percents(entries[-REPORT_CHART:]),
    }
