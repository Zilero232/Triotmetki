from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.classes import CLASS_KEYS, class_key
from ....core.compat import is_int, is_number, string_types, to_text
from ....core.shells import SHELL_CODES
from .constants import (
    ANALYSIS_KEYS,
    BOOK_VERSION,
    DAMAGE_WINDOW_S,
    DAMAGING,
    MAX_BATTLES,
    MAX_HITS,
    MODULE_KEYS,
    OUTCOMES,
    PART_NAMES,
    SIDES,
)
from .hits import clean_segments, impact


def _text(value):
    return to_text(value) if isinstance(value, string_types) and value else None


def _int_or_none(value):
    return int(value) if is_number(value) and value > 0 else None


def _keep_count(keep):
    return max(1, min(int(keep), MAX_BATTLES))


def _near(first, second):
    if first is None or second is None:
        return True
    return abs(first - second) <= DAMAGE_WINDOW_S


def _class_of(value):
    return value if value in CLASS_KEYS.values() else None


def clean_target(info):
    if not isinstance(info, dict) or not is_int(info.get('cd')) or info['cd'] <= 0:
        return None
    target = {'cd': int(info['cd']), 'name': _text(info.get('name')), 'class': _class_of(info.get('class'))}
    for key in MODULE_KEYS:
        target[key] = int(info[key]) if is_int(info.get(key)) and info[key] > 0 else None
    return target


def _clean_analysis(entry):
    angle = entry.get('angle')
    return {
        'angle': float(angle) if is_number(angle) and 0 <= angle <= 90 else None,
        'armor': _int_or_none(entry.get('armor')),
        'nominal': _int_or_none(entry.get('nominal')),
    }


def _shell_of(value):
    return value if value in SHELL_CODES else None


# The book file may be damaged or edited by hand: what is read back is checked like what the book writes.
def clean_hit(entry, targets):
    if not isinstance(entry, dict) or entry.get('side') not in SIDES or entry.get('target') not in targets:
        return None
    if entry.get('part') not in PART_NAMES or entry.get('outcome') not in OUTCOMES:
        return None
    segments = clean_segments(entry.get('segments'))
    if not segments:
        return None
    hit = {
        'side': entry['side'],
        'target': entry['target'],
        'vehicle': _text(entry.get('vehicle')),
        'class': _class_of(entry.get('class')),
        'segments': segments,
        'part': entry['part'],
        'outcome': entry['outcome'],
        'shell': _shell_of(entry.get('shell')),
        'caliber': _int_or_none(entry.get('caliber')),
        'damage': _int_or_none(entry.get('damage')) or 0,
    }
    hit.update(_clean_analysis(entry))
    return hit


def _clean_targets(raw):
    if not isinstance(raw, dict):
        return {}
    targets = {}
    for key, info in raw.items():
        cleaned = clean_target(info)
        if cleaned is not None:
            targets[to_text(key)] = cleaned
    return targets


def _is_battle_id(value):
    return is_number(value) or (isinstance(value, string_types) and bool(value))


def clean_battle(battle):
    if not isinstance(battle, dict) or not isinstance(battle.get('hits'), list):
        return None
    if not _is_battle_id(battle.get('id')):
        return None
    targets = _clean_targets(battle.get('targets'))
    cleaned = (clean_hit(entry, targets) for entry in battle['hits'][:MAX_HITS])
    hits = [hit for hit in cleaned if hit is not None]
    if not hits:
        return None
    started = battle.get('t')
    return {
        'id': to_text(battle['id']),
        't': started if is_number(started) else None,
        'map': _text(battle.get('map')),
        'vehicle': _text(battle.get('vehicle')),
        'targets': targets,
        'hits': hits,
    }


def _stored_battles(store):
    data = store.read({}) if store is not None else {}
    battles = data.get('battles') if isinstance(data, dict) else None
    if not isinstance(battles, list):
        return []
    cleaned = (clean_battle(battle) for battle in battles)
    return [battle for battle in cleaned if battle is not None]


class HitBook(object):
    """The hits between the player's own tank and other vehicles in the last `keep` battles, both ways: each with its
    packed points (decoded again on the model in the hangar), the shell, the outcome and the damage the own feedback
    reported; the angle and the armour are added once the hangar has measured them on the model."""

    def __init__(self, store, keep):
        self.store = store
        self.keep = _keep_count(keep)
        self.battles = _stored_battles(store)[-self.keep:]
        self.current = None
        self.pending = []

    def start(self, battle_id, at, map_label=None, vehicle=None):
        self.current = {
            'id': to_text(battle_id),
            't': at,
            'map': _text(map_label),
            'vehicle': _text(vehicle),
            'targets': {},
            'hits': [],
        }
        self.pending = []

    def target(self, key, info):
        if self.current is None:
            return False
        key = to_text(key)
        if key in self.current['targets']:
            return True
        cleaned = clean_target(info)
        if cleaned is None:
            return False
        self.current['targets'][key] = cleaned
        return True

    def hit(self, shot, at=None):
        """Records `shot` ({side, target, other, vehicle, class, segments, shell, caliber}); `other` is the other
        vehicle's id its damage is matched by."""
        if self.current is None or len(self.current['hits']) >= MAX_HITS:
            return False
        target = to_text(shot.get('target'))
        segments = clean_segments(shot.get('segments'))
        found = impact(segments)
        if found is None or shot.get('side') not in SIDES or target not in self.current['targets']:
            return False

        part, outcome = found
        entry = {
            'side': shot['side'],
            'target': target,
            'other': shot.get('other'),
            'vehicle': _text(shot.get('vehicle')),
            'class': class_key(shot.get('class')),
            'segments': segments,
            'part': part,
            'outcome': outcome,
            'shell': _shell_of(shot.get('shell')),
            'caliber': _int_or_none(shot.get('caliber')),
            'damage': 0,
            'at': at,
        }
        entry.update(dict((key, None) for key in ANALYSIS_KEYS))
        if outcome in DAMAGING:
            entry['damage'] = self._take_pending(entry['side'], entry['other'], at)
        self.current['hits'].append(entry)
        return True

    def _take_pending(self, side, other, at):
        for index, (pending_side, who, amount, when) in enumerate(self.pending):
            if pending_side == side and who == other and _near(at, when):
                del self.pending[index]
                return amount
        return 0

    def _waiting_hit(self, side, other, at):
        for entry in reversed(self.current['hits']):
            if not _near(at, entry['at']):
                return None
            waiting = entry['outcome'] in DAMAGING and not entry['damage']
            if waiting and entry['side'] == side and entry['other'] == other:
                return entry
        return None

    def damage(self, side, other, amount, at=None):
        if self.current is None or not is_number(amount) or amount <= 0:
            return False
        entry = self._waiting_hit(side, other, at)
        if entry is not None:
            entry['damage'] = int(amount)
            return True
        still = [item for item in self.pending if _near(at, item[3])]
        self.pending = still + [(side, other, int(amount), at)]
        return False

    def finish(self):
        current, self.current = self.current, None
        self.pending = []
        if current is None or not current['hits']:
            return None
        for entry in current['hits']:
            entry.pop('at', None)
            entry.pop('other', None)
        self.battles.append(current)
        del self.battles[:-self.keep]
        return current

    def battle(self, battle_id=None):
        """The recorded battle `battle_id`, else the latest one, or None."""
        for battle in reversed(self.battles):
            if battle['id'] == battle_id:
                return battle
        return self.battles[-1] if self.battles else None

    def measured(self, battle_id, index, analysis):
        battle = self.battle(battle_id)
        if battle is None or not 0 <= index < len(battle['hits']) or not isinstance(analysis, dict):
            return False
        battle['hits'][index].update(_clean_analysis(analysis))
        return True

    def resize(self, keep):
        self.keep = _keep_count(keep)
        del self.battles[:-self.keep]

    def clear(self):
        self.battles = []

    def save(self):
        if self.store is not None:
            self.store.write({'version': BOOK_VERSION, 'battles': self.battles})
