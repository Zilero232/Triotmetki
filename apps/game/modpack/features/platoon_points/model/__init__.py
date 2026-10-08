from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import clamp, is_int, is_number, string_types, to_text
from .constants import MAX_NAME, OWN_KINDS

# Fair play: mates' frags, alive state and HP as the stock UI shows; their damage is never estimated.


def rules_of(settings):
    return {
        'damage': settings.get('damage_step'),
        'assist': settings.get('assist_step'),
        'frag': settings.get('frag_points'),
        'alive': settings.get('alive_points'),
    }


def _steps(amount, step):
    if amount is None or step <= 0:
        return 0
    return int(amount) // step


# Fair play: a mate's damage and assist are unknown, only the own ones.
def points(rules, row):
    total = row['frags'] * rules['frag']
    if row['alive']:
        total += rules['alive']
    total += _steps(row['damage'], rules['damage'])
    total += _steps(row['assist'], rules['assist'])
    return total


def _positive_int(value):
    if is_number(value) and value > 0:
        return int(value)
    return 0


def _name(value):
    if not isinstance(value, string_types) or not value:
        return u'?'
    return to_text(value)[:MAX_NAME]


class Platoon(object):

    def __init__(self):
        self.members = {}
        self.order = []
        self.damage = 0
        self.assist = 0
        self.summary = {}

    def add(self, vehicle_id, seen):
        if not is_int(vehicle_id):
            return False
        if vehicle_id not in self.members:
            self.order.append(vehicle_id)
        known = self.members.get(vehicle_id) or {}
        max_hp = _positive_int(seen.get('max_hp'))
        is_alive = seen.get('alive', True)
        is_revived = is_alive and known.get('alive') is False
        hp = max_hp if is_revived else known.get('hp', max_hp)

        self.members[vehicle_id] = {
            'name': _name(seen.get('name')),
            'own': bool(seen.get('own')),
            'class': seen.get('class'),
            'max': max_hp,
            'hp': hp if is_alive else 0,
            'alive': bool(is_alive),
            'frags': known.get('frags', 0),
        }
        return True

    def set_health(self, vehicle_id, hp):
        member = self.members.get(vehicle_id)
        if member is None or not is_number(hp):
            return False
        hp = clamp(int(hp), 0, member['max'] or int(hp))
        if hp == member['hp']:
            return False
        member['hp'] = hp
        return True

    def killed(self, victim_id, killer_id, victim_is_enemy):
        changed = False
        victim = self.members.get(victim_id)
        if victim is not None and victim['alive']:
            victim['alive'] = False
            victim['hp'] = 0
            changed = True
        killer = self.members.get(killer_id)
        if killer is not None and victim_is_enemy:
            killer['frags'] += 1
            changed = True
        return changed

    def add_own(self, kind, amount):
        if not is_number(amount) or amount <= 0 or kind not in OWN_KINDS:
            return False
        setattr(self, kind, getattr(self, kind) + int(amount))
        return True

    def apply_summary(self, damage=None, assist=None):
        changed = False
        for key, value in (('damage', damage), ('assist', assist)):
            if not is_number(value) or value < 0:
                continue
            if self.summary.get(key) == int(value):
                continue
            self.summary[key] = int(value)
            changed = True
        return changed

    def own_totals(self):
        damage = max(self.damage, self.summary.get('damage', 0))
        assist = max(self.assist, self.summary.get('assist', 0))
        return damage, assist

    def is_platoon(self):
        return len(self.members) > 1

    def rows(self, rules, with_mates=True):
        damage, assist = self.own_totals()
        members = [self.members[vehicle_id] for vehicle_id in self.order]

        rows = []
        for member in members:
            if not member['own'] and not with_mates:
                continue
            row = dict(member, damage=None, assist=None)
            if member['own']:
                row['damage'] = damage
                row['assist'] = assist
            row['points'] = points(rules, row)
            rows.append(row)
        rows.sort(key=lambda row: not row['own'])
        return rows
