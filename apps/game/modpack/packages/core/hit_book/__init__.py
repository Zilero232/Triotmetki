"""The per-account book of the hits a battle recorded (battle_results' hits tab, the hit viewer). Pure.

`BattleBook` keeps the last `keep` battles in a durable store, collects the hits of the battle in progress and pairs
a damaging hit with the damage the own feedback reports for it, which arrives close to it in either order. A
subclass gives `max_hits`, `clean_stored(battle)` (a stored battle checked, or None) and `damage_key(entry)` (what a
hit and its damage share)."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import clamp, is_number, string_types, to_text
from .constants import (
    BOOK_VERSION,
    DAMAGE_WINDOW_S,
    DAMAGING,
    MAX_BATTLES,
    OUTCOME_BY_CODE,
    OUTCOME_CRIT,
    OUTCOMES,
    PART_CHASSIS,
    PART_GUN,
    PART_HULL,
    PART_NAMES,
    PART_TURRET,
)

__all__ = (
    'DAMAGING',
    'OUTCOMES',
    'OUTCOME_BY_CODE',
    'OUTCOME_CRIT',
    'PART_CHASSIS',
    'PART_GUN',
    'PART_HULL',
    'PART_NAMES',
    'PART_TURRET',
    'BattleBook',
    'is_battle_id',
    'keep_count',
    'near',
    'part_of',
    'text_or_none',
)


def near(first, second):
    """True when two moments are within the damage window, or either is unknown."""
    if first is None or second is None:
        return True
    return abs(first - second) <= DAMAGE_WINDOW_S


def keep_count(keep):
    return clamp(int(keep), 1, MAX_BATTLES)


def is_battle_id(value):
    return is_number(value) or (isinstance(value, string_types) and bool(value))


def part_of(index):
    """The tank part name of a shot point's part index; the chassis' track and wheel indices count as the chassis."""
    return PART_NAMES[index] if 0 <= index < len(PART_NAMES) else PART_NAMES[0]


def text_or_none(value):
    return to_text(value) if isinstance(value, string_types) and value else None


class BattleBook(object):
    """The stored battles plus the one in progress (`current`, None outside a battle)."""

    max_hits = 0

    def __init__(self, store, keep):
        self.store = store
        self.keep = keep_count(keep)
        self.battles = self._stored()[-self.keep:]
        self.current = None
        self.pending = []

    def clean_stored(self, battle):
        raise NotImplementedError

    def damage_key(self, entry):
        raise NotImplementedError

    def _stored(self):
        data = self.store.read({}) if self.store is not None else {}
        battles = data.get('battles') if isinstance(data, dict) else None
        if not isinstance(battles, list):
            return []
        cleaned = (self.clean_stored(battle) for battle in battles)
        return [battle for battle in cleaned if battle is not None]

    def open(self, current):
        self.current = current
        self.pending = []

    def has_room(self):
        return self.current is not None and len(self.current['hits']) < self.max_hits

    def add_hit(self, entry):
        """Appends a hit with its moment in `at`; a damaging one takes the damage already reported for it."""
        if entry['outcome'] in DAMAGING:
            entry['damage'] = self._take_pending(self.damage_key(entry), entry['at'])
        self.current['hits'].append(entry)

    def _take_pending(self, key, at):
        for index, (who, amount, when) in enumerate(self.pending):
            if who == key and near(at, when):
                del self.pending[index]
                return amount
        return 0

    def _waiting_hit(self, key, at):
        for entry in reversed(self.current['hits']):
            if not near(at, entry['at']):
                return None
            waiting = entry['outcome'] in DAMAGING and not entry['damage']
            if waiting and self.damage_key(entry) == key:
                return entry
        return None

    def add_damage(self, key, amount, at):
        """Gives reported damage to the hit waiting for it, or keeps it for a hit still to come; True when given."""
        if self.current is None or not is_number(amount) or amount <= 0:
            return False
        entry = self._waiting_hit(key, at)
        if entry is not None:
            entry['damage'] = int(amount)
            return True
        still = [item for item in self.pending if near(at, item[2])]
        self.pending = still + [(key, int(amount), at)]
        return False

    def finished(self, current):
        """The battle to keep once `current` ends; a subclass strips its in-battle keys or joins it to a kept one."""
        return current

    def finish(self):
        current = self.current
        self.current = None
        self.pending = []
        if current is None or not current['hits']:
            return None
        for entry in current['hits']:
            entry.pop('at', None)
        current = self.finished(current)
        self.battles.append(current)
        del self.battles[:-self.keep]
        return current

    def resize(self, keep):
        self.keep = keep_count(keep)
        del self.battles[:-self.keep]

    def clear(self):
        self.battles = []

    def save(self):
        if self.store is not None:
            self.store.write({'version': BOOK_VERSION, 'battles': self.battles})
