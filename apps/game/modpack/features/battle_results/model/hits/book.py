from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.classes import CLASS_KEYS, class_key
from .....core.compat import fraction, is_number, to_text
from .....core.hit_book import OUTCOMES, PART_NAMES, BattleBook, is_battle_id, text_or_none
from .constants import AXES, MAX_HITS, MIDDLE, PART_ORDER, SIDES
from .points import impact, side_of


def _optional_text(value):
    return to_text(value) if value else None


def _fraction(value):
    if not is_number(value):
        return MIDDLE
    return fraction(float(value))


def _positive_damage(value):
    if is_number(value) and value > 0:
        return int(value)
    return 0


def clean_hit(entry):
    if not isinstance(entry, dict):
        return None
    if entry.get('part') not in PART_NAMES or entry.get('outcome') not in OUTCOMES:
        return None

    vehicle_class = entry.get('class')
    hit = {
        'part': entry['part'],
        'outcome': entry['outcome'],
        'attacker': text_or_none(entry.get('attacker')),
        'class': vehicle_class if vehicle_class in CLASS_KEYS.values() else None,
        'damage': _positive_damage(entry.get('damage')),
    }
    for axis in AXES:
        hit[axis] = _fraction(entry.get(axis))
    return hit


def clean_battle(battle):
    if not isinstance(battle, dict) or not isinstance(battle.get('hits'), list):
        return None
    if not is_battle_id(battle.get('id')):
        return None

    cleaned = (clean_hit(entry) for entry in battle['hits'][:MAX_HITS])
    hits = [hit for hit in cleaned if hit is not None]
    if not hits:
        return None

    started = battle.get('t')
    return {
        'id': to_text(battle['id']),
        'vehicle': text_or_none(battle.get('vehicle')),
        't': started if is_number(started) else None,
        'hits': hits,
    }


class HitBook(BattleBook):

    max_hits = MAX_HITS

    def clean_stored(self, battle):
        return clean_battle(battle)

    def damage_key(self, entry):
        return entry['attacker']

    def start(self, battle_id, vehicle, at):
        self.open({'id': to_text(battle_id), 'vehicle': _optional_text(vehicle), 't': at, 'hits': []})

    def hit(self, segments, attacker=None, vehicle_class=None, at=None):
        if not self.has_room():
            return False
        found = impact(segments)
        if found is None:
            return False

        part, outcome, (x, y, z) = found
        self.add_hit({
            'part': part,
            'outcome': outcome,
            'x': x,
            'y': y,
            'z': z,
            'attacker': _optional_text(attacker),
            'class': class_key(vehicle_class),
            'damage': 0,
            'at': at,
        })
        return True

    def damage(self, attacker, amount, at=None):
        return self.add_damage(_optional_text(attacker), amount, at)


def _zero_counts(keys):
    return {key: 0 for key in keys}


def summary(battle):
    hits = battle.get('hits') or []
    counts = _zero_counts(OUTCOMES)
    parts = _zero_counts(PART_ORDER)
    sides = {part: _zero_counts(SIDES) for part in PART_ORDER}
    damage = 0

    for entry in hits:
        if entry.get('outcome') in counts:
            counts[entry['outcome']] += 1
        part = entry.get('part')
        if part in parts:
            parts[part] += 1
            side = side_of(part, entry.get('x', MIDDLE), entry.get('z', MIDDLE))
            if side is not None:
                sides[part][side] += 1
        if is_number(entry.get('damage')):
            damage += int(entry['damage'])

    return {'hits': len(hits), 'counts': counts, 'parts': parts, 'sides': sides, 'damage': damage}
