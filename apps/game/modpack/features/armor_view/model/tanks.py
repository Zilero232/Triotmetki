from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.classes import class_key
from ....core.vendor import attr
from .constants import MAX_QUERY_CHARS, SEARCH_LIMIT, UNLISTED_FLAGS


@attr.s(frozen=True)
class TankRow(object):
    cd = attr.ib()
    name = attr.ib()
    tier = attr.ib()
    kind = attr.ib(default=None)
    is_own = attr.ib(default=False)


def is_listed(flags):
    return not any(flags.get(name) for name in UNLISTED_FLAGS)


def _strongest_first(row):
    return -(row.tier or 0), row.name.lower()


def garage_order(rows):
    return sorted(rows, key=_strongest_first)


def clean_query(text):
    return text.strip().lower()[:MAX_QUERY_CHARS]


def _match_rank(row):
    return not row.is_own, -(row.tier or 0), row.name.lower()


def search(rows, query, own_ids):
    if not query:
        return []
    found = []
    for row in rows:
        if query in row.name.lower():
            found.append(attr.evolve(row, is_own=row.cd in own_ids))
    found.sort(key=_match_rank)
    return found[:SEARCH_LIMIT]


def tank_state(row, active_cd=None):
    return {
        'cd': row.cd,
        'name': row.name,
        'tier': row.tier,
        'class': class_key(row.kind),
        'own': row.is_own,
        'active': row.cd == active_cd,
    }
