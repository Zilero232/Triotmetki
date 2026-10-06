# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import as_int, clean_text, is_int, to_text
from .constants import (
    BEST_BATTLES,
    CARDINALITY_RANGE,
    MAX_NAME,
    MAX_ROUND_BATTLES,
    MAX_ROUNDS,
    MIN_TIER,
    RANDOM_BONUS_TYPE,
    ROUND_S,
    TIER_RANGE,
)

# Fair play: only the player's own battle results (clean XP of their own battles); nothing about the other players of
# the competition group, whose places only the game's own event page shows.


def _in_range(value, bounds, default):
    low, high = bounds
    if value is not None and low <= value <= high:
        return value
    return default


def clean_event(raw):
    if not isinstance(raw, dict):
        return None
    return {
        'name': clean_text(raw.get('name'), MAX_NAME),
        'cardinality': _in_range(as_int(raw.get('cardinality'), None), CARDINALITY_RANGE, BEST_BATTLES),
        'start': as_int(raw.get('start'), None),
        'end': as_int(raw.get('end'), None),
        'min_tier': _in_range(as_int(raw.get('min_tier'), None), TIER_RANGE, MIN_TIER),
    }


def counts(event, min_tier=MIN_TIER):
    if not isinstance(event, dict) or event.get('bonus_type') != RANDOM_BONUS_TYPE:
        return False
    tier = (event.get('vehicle') or {}).get('tier')
    return is_int(tier) and tier >= min_tier


def _battle(item):
    if not isinstance(item, dict):
        return None
    at = as_int(item.get('at'), None)
    xp = as_int(item.get('xp'), None)
    if at is None or xp is None or xp < 0:
        return None
    tank = clean_text(item.get('tank'), MAX_NAME)
    return {'arena': to_text(item.get('arena') or u''), 'at': at, 'xp': xp, 'tank': tank}


def _round(item):
    if not isinstance(item, dict) or as_int(item.get('start'), None) is None:
        return None
    battles = [battle for battle in map(_battle, item.get('battles') or ()) if battle]
    if not battles:
        return None
    return {'start': as_int(item['start'], None), 'battles': battles[-MAX_ROUND_BATTLES:]}


def _starts_a_round(last, at):
    if last is None:
        return True
    return at < last['start'] or at >= last['start'] + ROUND_S


# The own rounds: a round starts with a battle that counts and takes every battle that started within ROUND_S of it.
class TriathlonRounds(object):

    def __init__(self, data=None):
        items = data.get('rounds') if isinstance(data, dict) else None
        rounds = [found for found in map(_round, items or ()) if found]
        self.rounds = rounds[-MAX_ROUNDS:]

    def add(self, event, min_tier=MIN_TIER, tank=None):
        if not counts(event, min_tier):
            return False
        at = as_int(event.get('arena_created_at'), None) or as_int(event.get('occurred_at'), None)
        xp = as_int((event.get('stats') or {}).get('original_xp'), None)
        arena = to_text(event.get('arena_unique_id') or u'')
        if at is None or xp is None:
            return False
        if self._has_arena(arena):
            return False

        last = self.last()
        if _starts_a_round(last, at):
            last = {'start': at, 'battles': []}
            self.rounds = (self.rounds + [last])[-MAX_ROUNDS:]

        tank_name = tank or (event.get('vehicle') or {}).get('name')
        battle = _battle({'arena': arena, 'at': at, 'xp': xp, 'tank': tank_name})
        last['battles'] = (last['battles'] + [battle])[-MAX_ROUND_BATTLES:]
        return True

    def _has_arena(self, arena):
        if not arena:
            return False
        return any(battle['arena'] == arena for item in self.rounds for battle in item['battles'])

    def last(self):
        return self.rounds[-1] if self.rounds else None

    def best_score(self, cardinality, since=None):
        scores = [score(item, cardinality) for item in self.rounds if since is None or item['start'] >= since]
        return max(scores) if scores else None

    def dump(self):
        return {'rounds': self.rounds}


def best_battles(item, cardinality):
    return sorted(item['battles'], key=lambda battle: (-battle['xp'], battle['at']))[:cardinality]


def score(item, cardinality):
    return sum(battle['xp'] for battle in best_battles(item, cardinality))


def left_s(item, now):
    return max(0, int(item['start'] + ROUND_S - now))
