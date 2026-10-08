from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import as_int, is_int, is_number, string_types, to_text
from ....core.moe import implausible_change, is_post_battle_reading
from .constants import (
    ASSIST_STATS,
    CLASS_TAGS,
    HISTORY_VERSION,
    ITEM_CODE,
    MAX_BATTLE_DELTA,
    MAX_VEHICLES,
    MOE_BONUS_TYPES,
    READING_KEYS,
    RESULTS_PERCENT_MAX,
    WRONG_SCALE_SPAN,
    SOURCE_BATTLE,
    SOURCE_HANGAR,
)


def vehicle_label(name):
    if not isinstance(name, string_types) or not name:
        return u''
    short = to_text(name).split(':', 1)[-1]
    return ITEM_CODE.sub(u'', short) or short


def percent(rating):
    if not is_int(rating):
        return None
    return round(rating / 100.0, 2)


def rating_delta(before, after):
    first = percent(before.get('rating')) if before else None
    last = percent(after.get('rating'))
    if first is None or last is None:
        return None
    delta = round(last - first, 2)
    return delta if abs(delta) <= MAX_BATTLE_DELTA else None


def _is_recordable(tank_id, dossier):
    if not is_int(tank_id) or not is_int(dossier.get('damage_rating')):
        return False
    return bool(dossier.get('moving_avg_damage'))


def _entry(time_s, dossier, source):
    return {
        't': int(time_s),
        'rating': dossier['damage_rating'],
        'avg': dossier['moving_avg_damage'],
        'marks': dossier.get('marks_on_gun'),
        'source': source,
        'arena': None,
        'damage': None,
        'combined': None,
        'result': None,
    }


def _battle_entry(event, moe, before):
    stats = event.get('stats') or {}
    damage = as_int(stats.get('damage_dealt'))
    best_assist = max(as_int(stats.get(key)) for key in ASSIST_STATS)

    entry = _entry(event.get('occurred_at') or 0, moe, SOURCE_BATTLE)
    entry['arena'] = event.get('arena_unique_id')
    entry['damage'] = damage
    entry['combined'] = damage + best_assist
    entry['result'] = event.get('result')
    entry['before'] = before if is_int(before) else None
    return entry


def _same_reading(entry, other):
    return all(entry.get(key) == other.get(key) for key in READING_KEYS)


def _note_reached(vehicle, previous, entry):
    marks = entry['marks']
    if not is_int(marks):
        return
    reached = vehicle.setdefault('reached', {})
    before = previous.get('marks') if previous else None
    if not is_int(before):
        return
    for mark in range(max(before, 0) + 1, marks + 1):
        reached.setdefault(str(mark), entry['t'])


def _has_start(entries, index):
    return index > 0 or is_int(entries[index].get('before'))


def _battle_indexes(entries):
    return [
        index for index, item in enumerate(entries)
        if item.get('source') == SOURCE_BATTLE and _has_start(entries, index)
    ]


def start_of(entries, index):
    before = entries[index].get('before')
    if entries[index].get('source') == SOURCE_BATTLE and is_int(before):
        return {'rating': before}
    return entries[index - 1] if index > 0 else None


def _span_delta(entries, indexes):
    if not indexes:
        return None
    return rating_delta(start_of(entries, indexes[0]), entries[indexes[-1]])


def _battle_deltas(entries, indexes):
    deltas = [rating_delta(start_of(entries, index), entries[index]) for index in indexes]
    return [delta for delta in deltas if delta is not None]


def _hundredths_near(entries, index):
    before = entries[index].get('before')
    if is_int(before) and before > RESULTS_PERCENT_MAX:
        return before
    neighbours = entries[index - 1::-1] if index else []
    for item in list(neighbours) + entries[index + 1:]:
        rating = item.get('rating')
        if item.get('source') == SOURCE_HANGAR and is_int(rating) and rating > RESULTS_PERCENT_MAX:
            return rating
    return None


def _is_wrong_scale(entries, index):
    entry = entries[index]
    rating = entry.get('rating')
    if entry.get('source') != SOURCE_BATTLE or not is_int(rating) or rating > RESULTS_PERCENT_MAX:
        return False
    near = _hundredths_near(entries, index)
    return near is not None and abs(rating * 100 - near) <= WRONG_SCALE_SPAN


def repair_entries(entries):
    kept = [entry for index, entry in enumerate(entries) if not _is_wrong_scale(entries, index)]
    return kept, len(entries) - len(kept)


def stored_vehicles(data):
    vehicles = data.get('vehicles') if isinstance(data, dict) else None
    if not isinstance(vehicles, dict):
        return {}

    kept = {}
    for key, value in vehicles.items():
        if isinstance(value, dict):
            kept[key] = value
    return kept


class MarksHistory(object):

    def __init__(self, store, max_entries=100):
        self.store = store
        self.max_entries = max_entries
        self.vehicles = stored_vehicles(store.read({}))
        self.rejected = None
        self.repaired = self._repair()

    def _repair(self):
        dropped = 0
        for vehicle in self.vehicles.values():
            entries, count = repair_entries(vehicle.get('entries') or [])
            if count:
                vehicle['entries'] = entries
                dropped += count
        return dropped

    def save(self):
        self.store.write({'version': HISTORY_VERSION, 'vehicles': self.vehicles})

    def vehicle(self, tank_id):
        return self.vehicles.get(str(tank_id))

    def _entries(self, tank_id):
        known = self.vehicle(tank_id)
        if not known:
            return []
        return known.get('entries') or []

    def _vehicle_for(self, tank_id, label, tier, kind):
        blank = {'label': label or u'', 'tier': tier, 'entries': [], 'reached': {}}
        vehicle = self.vehicles.setdefault(str(tank_id), blank)
        if label:
            vehicle['label'] = label
        if kind in CLASS_TAGS:
            vehicle['class'] = kind
        if is_int(tier):
            vehicle['tier'] = tier
        return vehicle

    def _record(self, vehicle, entry):
        entries = vehicle.setdefault('entries', [])
        previous = entries[-1] if entries else None
        _note_reached(vehicle, previous, entry)

        entries.append(entry)
        del entries[:-self.max_entries]
        vehicle['updated'] = entry['t']
        self._forget_oldest()
        return entry

    def _forget_oldest(self):
        while len(self.vehicles) > MAX_VEHICLES:
            oldest = min(self.vehicles, key=lambda key: self.vehicles[key].get('updated') or 0)
            del self.vehicles[oldest]

    def _has_arena(self, tank_id, arena):
        if not arena:
            return False
        return any(item.get('arena') == arena for item in self._entries(tank_id))

    def record_battle(self, event, label=None, kind=None, before=None):
        moe = event.get('moe') or {}
        info = event.get('vehicle') or {}
        tank_id = info.get('tank_id')
        self.rejected = None
        if event.get('bonus_type') not in MOE_BONUS_TYPES:
            return None
        if not _is_recordable(tank_id, moe) or self._has_arena(tank_id, event.get('arena_unique_id')):
            return None
        self.rejected = implausible_change(before, moe['damage_rating'])
        if self.rejected is not None:
            return None

        entry = _battle_entry(event, moe, before)
        vehicle = self._vehicle_for(tank_id, label or vehicle_label(info.get('name')), info.get('tier'), kind)
        return self._record(vehicle, entry)

    def _correct_battle(self, entries, entry):
        last = entries[-1] if entries else None
        if last is None or last.get('source') != SOURCE_BATTLE or last.get('marks') != entry['marks']:
            return False
        reading = {'moving_avg_damage': last.get('avg'), 'damage_rating': last.get('rating')}
        snapshot = {'moving_avg_damage': entry['avg'], 'damage_rating': entry['rating']}
        if last.get('rating') == entry['rating'] or not is_post_battle_reading(reading, snapshot):
            return False
        last['rating'] = entry['rating']
        return True

    def record_snapshot(self, snapshot, now, label=None, kind=None):
        tank_id = snapshot.get('tank_id')
        if not _is_recordable(tank_id, snapshot):
            return None
        entry = _entry(now, snapshot, SOURCE_HANGAR)
        entries = self._entries(tank_id)
        if self._correct_battle(entries, entry):
            return entries[-1]
        if entries and _same_reading(entries[-1], entry):
            return None

        vehicle = self._vehicle_for(tank_id, label or vehicle_label(snapshot.get('name')), snapshot.get('tier'), kind)
        return self._record(vehicle, entry)

    def clear(self, tank_id):
        return self.vehicles.pop(str(tank_id), None) is not None

    def last_reading(self, tank_id):
        for entry in reversed(self._entries(tank_id)):
            if is_int(entry.get('rating')) and is_number(entry.get('avg')):
                return {
                    'tank_id': tank_id,
                    'moving_avg_damage': entry['avg'],
                    'damage_rating': entry['rating'],
                    'marks_on_gun': entry.get('marks'),
                }
        return None

    def summary(self, tank_id, trend_battles):
        entries = self._entries(tank_id)
        if not entries:
            return None
        vehicle = self.vehicle(tank_id)
        last = entries[-1]
        battles = _battle_indexes(entries)
        window = battles[-trend_battles:]

        return {
            'label': vehicle.get('label') or u'',
            'tier': vehicle.get('tier'),
            'percent': percent(last.get('rating')),
            'marks': last.get('marks'),
            'avg': last.get('avg'),
            'last_delta': _span_delta(entries, battles[-1:]),
            'trend': _span_delta(entries, window),
            'trend_battles': len(window),
            'deltas': _battle_deltas(entries, window),
            'reached': dict(vehicle.get('reached') or {}),
            'updated': vehicle.get('updated'),
        }

    def ordered(self):
        return sorted(self.vehicles, key=lambda key: -(self.vehicles[key].get('updated') or 0))
