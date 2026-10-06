from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.classes import CLASS_KEYS, class_key
from ....core.compat import is_int, is_number, string_types, to_text
from ....core.hit_book import OUTCOMES, PART_NAMES, BattleBook, is_battle_id, text_or_none
from ....core.shells import SHELL_CODES
from .constants import AIM_LIMIT, ANALYSIS_KEYS, MAP_NAME, MAX_HITS, MAX_TIER, MODULE_KEYS, RESULTS, SIDES
from .hits import clean_segments, impact


def _int_or_none(value):
    return int(value) if is_number(value) and value > 0 else None


def _class_of(value):
    return value if value in CLASS_KEYS.values() else None


def clean_target(info):
    if not isinstance(info, dict) or not is_int(info.get('cd')) or info['cd'] <= 0:
        return None
    target = {'cd': int(info['cd']), 'name': text_or_none(info.get('name')), 'class': _class_of(info.get('class'))}
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


def _geometry_of(value):
    return to_text(value) if isinstance(value, string_types) and MAP_NAME.match(value) else None


def _tier_of(value):
    return int(value) if is_int(value) and 1 <= value <= MAX_TIER else None


def _shell_of(value):
    return value if value in SHELL_CODES else None


def clean_aim(value):
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        return None
    if not all(is_number(angle) and abs(angle) <= AIM_LIMIT for angle in value):
        return None
    return [round(float(angle), 4) for angle in value]


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
        'vehicle': text_or_none(entry.get('vehicle')),
        'class': _class_of(entry.get('class')),
        'segments': segments,
        'part': entry['part'],
        'outcome': entry['outcome'],
        'shell': _shell_of(entry.get('shell')),
        'caliber': _int_or_none(entry.get('caliber')),
        'damage': _int_or_none(entry.get('damage')) or 0,
        'aim': clean_aim(entry.get('aim')),
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


def clean_battle(battle):
    if not isinstance(battle, dict) or not isinstance(battle.get('hits'), list):
        return None
    if not is_battle_id(battle.get('id')):
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
        'map': text_or_none(battle.get('map')),
        'vehicle': text_or_none(battle.get('vehicle')),
        'geometry': _geometry_of(battle.get('geometry')),
        'tier': _tier_of(battle.get('tier')),
        'result': battle.get('result') if battle.get('result') in RESULTS else None,
        'targets': targets,
        'hits': hits,
    }


class HitBook(BattleBook):

    max_hits = MAX_HITS

    def clean_stored(self, battle):
        return clean_battle(battle)

    def damage_key(self, entry):
        return entry['side'], entry['other']

    def start(self, battle_id, at, map_label=None, vehicle=None, arena=None):
        arena = arena or {}
        self.open({
            'id': to_text(battle_id),
            't': at,
            'map': text_or_none(map_label),
            'vehicle': text_or_none(vehicle),
            'geometry': _geometry_of(arena.get('geometry')),
            'tier': _tier_of(arena.get('tier')),
            'result': None,
            'targets': {},
            'hits': [],
        })

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
        if not self.has_room():
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
            'vehicle': text_or_none(shot.get('vehicle')),
            'class': class_key(shot.get('class')),
            'segments': segments,
            'part': part,
            'outcome': outcome,
            'shell': _shell_of(shot.get('shell')),
            'caliber': _int_or_none(shot.get('caliber')),
            'damage': 0,
            'aim': clean_aim(shot.get('aim')),
            'at': at,
        }
        entry.update({key: None for key in ANALYSIS_KEYS})
        self.add_hit(entry)
        return True

    def damage(self, side, other, amount, at=None):
        return self.add_damage((side, other), amount, at)

    def finished(self, current):
        for entry in current['hits']:
            entry.pop('other', None)
        return self._joined(current)

    # A battle rejoined after a disconnect starts again under the same arenaUniqueID: its hits join the part already
    # kept, so one id stays one battle for the page and the viewer.
    def _joined(self, current):
        earlier = [battle for battle in self.battles if battle['id'] == current['id']]
        if not earlier:
            return current
        joined = earlier[-1]
        self.battles = [battle for battle in self.battles if battle['id'] != current['id']]
        for key, target in current['targets'].items():
            joined['targets'].setdefault(key, target)
        joined['hits'] = (joined['hits'] + current['hits'])[:MAX_HITS]
        return joined

    def battle(self, battle_id=None):
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

    def resolved(self, battle_id, result):
        battle = self.battle(to_text(battle_id))
        if battle is None or battle['id'] != to_text(battle_id) or result not in RESULTS or battle['result'] == result:
            return False
        battle['result'] = result
        return True
