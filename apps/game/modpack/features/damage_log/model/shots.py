from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, is_number, to_text
from ....core.shells import SHELL_CODES
from .constants import DAMAGE_OUTCOMES, MAX_ENTRIES, MERGE_WINDOW_S, OUTCOMES, SOURCE_SHOT, SOURCES

# Fair play: the player's own shots, their outcome (the own hit markers), damage and crits, and the HP left after the
# player's own shot as the target's marker shows it; class and max HP as the player panels show them.


def positive_int(value):
    if is_number(value) and value > 0:
        return int(value)
    return None


def _awaits_damage(entry):
    return entry['damage'] is None and entry['outcome'] in DAMAGE_OUTCOMES


def _awaits_health(entry):
    return entry['hp'] is None


def _name_once(entry, vehicle):
    if vehicle and not entry['vehicle']:
        entry['vehicle'] = to_text(vehicle)


def _new_group(entry):
    return {
        'target': entry['target'],
        'vehicle': None,
        'hits': 0,
        'damage': 0,
        'crits': 0,
        'hp': None,
        'outcome': None,
        'shell': None,
        'gold': False,
        'source': None,
        'seq': entry['seq'],
    }


def _add_to_group(group, entry):
    group['hits'] += 1
    group['damage'] += entry['damage'] or 0
    group['crits'] += entry['crits']
    group['outcome'] = entry['outcome']
    group['source'] = entry['source']
    group['vehicle'] = entry['vehicle'] or group['vehicle']
    group['seq'] = entry['seq']
    if entry['shell'] is not None:
        group['shell'] = entry['shell']
        group['gold'] = entry['gold']
    if entry['hp'] is not None:
        group['hp'] = entry['hp']


def _grouped_row(group):
    row = dict(group)
    row['id'] = 't%s-%d' % (group['target'], group['hits'])
    row['damage'] = group['damage'] or None
    return row


def _shot_row(entry):
    row = dict(entry, hits=1)
    row['id'] = 's%d' % entry['seq']
    return row


class ShotLog(object):

    def __init__(self, sequence):
        self.sequence = sequence
        self.entries = []
        self.targets = {}

    def describe(self, target_id, vehicle_class=None, max_hp=None):
        if not is_int(target_id):
            return False

        self.targets[target_id] = {'class': vehicle_class, 'max': positive_int(max_hp)}
        return True

    def _latest(self, target_id, at, accepts=None):
        for entry in reversed(self.entries):
            if entry['target'] != target_id or entry['source'] != SOURCE_SHOT:
                continue
            if at is None or entry['at'] is None or at - entry['at'] > MERGE_WINDOW_S:
                return None
            if accepts is None or accepts(entry):
                return entry
        return None

    def _append(self, target_id, outcome, at, vehicle, marked=True):
        entry = {
            'seq': next(self.sequence),
            'target': target_id,
            'vehicle': to_text(vehicle) if vehicle else None,
            'outcome': outcome,
            'damage': None,
            'shell': None,
            'gold': False,
            'source': 'shot',
            'crits': 0,
            'hp': None,
            'marked': marked,
            'at': at,
        }
        self.entries.append(entry)
        del self.entries[:-MAX_ENTRIES]
        return entry

    # The battle event with the damage may come before the hit marker of the same shot: the marker then only names
    # the outcome of that entry.
    def add_result(self, target_id, outcome, at, vehicle=None):
        if outcome not in OUTCOMES or not is_int(target_id):
            return False

        entry = self._latest(target_id, at)
        if entry is None or entry['marked']:
            self._append(target_id, outcome, at, vehicle)
            return True

        entry['outcome'] = outcome
        entry['marked'] = True
        _name_once(entry, vehicle)
        return True

    def add_damage(self, amount, hit):
        damage = positive_int(amount)
        if not is_int(hit.vehicle_id) or damage is None:
            return False

        entry = self._damage_entry(hit)
        entry['damage'] = damage
        entry['shell'] = hit.shell if hit.shell in SHELL_CODES else None
        entry['gold'] = bool(hit.gold) and entry['shell'] is not None
        _name_once(entry, hit.vehicle)
        return True

    # Fire and ramming damage is a row of its own: no hit marker belongs to it.
    def _damage_entry(self, hit):
        source = hit.source if hit.source in SOURCES else SOURCE_SHOT
        if source != SOURCE_SHOT:
            entry = self._append(hit.vehicle_id, None, hit.at, hit.vehicle)
            entry['source'] = source
            return entry

        entry = self._latest(hit.vehicle_id, hit.at, _awaits_damage)
        return entry or self._append(hit.vehicle_id, 'pen', hit.at, hit.vehicle, marked=False)

    def add_crits(self, target_id, count, at):
        if not is_int(count) or count <= 0:
            return False

        entry = self._latest(target_id, at)
        if entry is None:
            return False

        entry['crits'] += count
        return True

    def set_health(self, target_id, health, at):
        if not is_number(health):
            return False

        entry = self._latest(target_id, at, _awaits_health)
        if entry is None:
            return False

        entry['hp'] = max(0, int(health))
        return True

    def rows(self):
        return [_shot_row(entry) for entry in reversed(self.entries)]

    def grouped_rows(self):
        groups = {}
        for entry in self.entries:
            target_id = entry['target']
            if target_id not in groups:
                groups[target_id] = _new_group(entry)
            _add_to_group(groups[target_id], entry)

        latest_first = sorted(groups.values(), key=lambda group: group['seq'], reverse=True)
        return [_grouped_row(group) for group in latest_first]


# VEHICLE_HEALTH fires for any health change of a visible vehicle; its payload is (newHealth, attackerInfo,
# attackReasonID) (RU 1.45 feedback_adaptor._setVehicleHealthChanged). Only the player's own hit may set "HP left".
def own_shot_health(value, own_vehicle_id):
    if not isinstance(value, (list, tuple)) or len(value) < 2 or own_vehicle_id is None:
        return None

    health, attacker = value[0], value[1]
    if getattr(attacker, 'vehicleID', None) != own_vehicle_id:
        return None

    return health
