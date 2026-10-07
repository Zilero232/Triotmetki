"""Per-battle counters of the player's own feedback: `BattleTally` for the python.log line that shows what the client
reported (own hit markers, own battle events (damage, blocked, assist, stun, received) and the vanilla totals of the
personal efficiency controller), and `Counters`, `own_damage`, `assist_with_stun` for the HUD panels that count the
own battle. Pure: the events are the client's objects, read only through their public getters."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import call, is_number
from .constants import (
    CRIT_KEYS,
    DAMAGE_KEYS,
    EFFICIENCY_KEYS,
    ENEMY_ONLY_KEYS,
    EVENT_KEYS,
    DETAIL_LINE,
    MARKER_OUTCOMES,
    PEN_OUTCOMES,
    SUMMARY_LINE,
)

__all__ = (
    'BattleTally',
    'Counters',
    'EFFICIENCY_KEYS',
    'EVENT_KEYS',
    'MARKER_OUTCOMES',
    'assist_with_stun',
    'efficiency_totals',
    'extra_amount',
    'own_damage',
)


def extra_amount(extra, name='getDamage'):
    value = call(extra, name, 0)
    return int(value) if is_number(value) and value > 0 else 0


def own_damage(events, damage_type, is_enemy):
    """The damage one onPlayerFeedbackReceived batch reports the player dealt to enemies (events of `damage_type`,
    targets `is_enemy(vehicle_id)` accepts)."""
    if damage_type is None:
        return 0

    def is_own_damage(event):
        return call(event, 'getBattleEventType') == damage_type and is_enemy(call(event, 'getTargetID'))

    return sum(extra_amount(call(event, 'getExtra')) for event in events or () if is_own_damage(event))


# RU 1.45 feedback_events BattleSummaryFeedbackEvent reports track + radio and stun assist apart.
def assist_with_stun(assist, stun):
    return assist + stun if is_number(assist) and is_number(stun) else assist


def efficiency_totals(totals, keys_by_type):
    """{'dealt': .., 'assist': .., ...} from the controller's {PERSONAL_EFFICIENCY_TYPE: total}; only the types it
    holds (onTotalEfficiencyUpdated sends the changed ones)."""
    picked = {}
    for efficiency_type, value in (totals or {}).items():
        key = keys_by_type.get(efficiency_type)
        if key is not None and is_number(value) and value >= 0:
            picked[key] = int(value)
    return picked


class Counters(object):
    """This battle's own counts by key: `add` sums what the feedback events report, `raise_to` lifts a key to the
    client's summary total. Both return whether the value changed; `values` is {key: int}."""

    def __init__(self, keys):
        self.values = {key: 0 for key in keys}

    def add(self, key, amount=1):
        if key not in self.values or not is_number(amount) or amount <= 0:
            return False
        self.values[key] += int(amount)
        return True

    def raise_to(self, key, value):
        if key in self.values and is_number(value) and value > self.values[key]:
            self.values[key] = int(value)
            return True
        return False


class BattleTally(object):

    def __init__(self):
        self.markers = {}
        self.events = {key: 0 for _, key in EVENT_KEYS}
        self.event_counts = {key: 0 for _, key in EVENT_KEYS}
        self.vanilla = {}
        self.batches = 0
        self.hooks = []

    def add_marker(self, outcome):
        if outcome is None:
            return False
        self.markers[outcome] = self.markers.get(outcome, 0) + 1
        return True

    def add_events(self, events, keys_by_kind, is_enemy):
        self.batches += 1
        added = 0
        for event in events or ():
            key = _event_key(event, keys_by_kind, is_enemy)
            if key is None:
                continue
            self.events[key] += _event_amount(event, key)
            self.event_counts[key] += 1
            added += 1
        return added

    def apply_vanilla(self, totals):
        changed = False
        for key, value in totals.items():
            if self.vanilla.get(key) != value:
                self.vanilla[key] = value
                changed = True
        return changed

    def hooked(self, name, attached):
        self.hooks.append((name, bool(attached)))

    def values(self):
        markers = self.markers
        values = {
            'hits': sum(markers.values()),
            'pens': sum(markers.get(outcome, 0) for outcome in PEN_OUTCOMES),
            'ricochets': markers.get('ricochet', 0),
            'damaging_hits': self.event_counts['dealt'],
        }
        for key in DAMAGE_KEYS:
            values[key] = max(self.events[key], self.vanilla.get(key, 0))
        return values

    def summary(self):
        values = self.values()
        hooks = _listing('%s %s' % (name, 'ok' if attached else 'MISSING') for name, attached in self.hooks)
        vanilla = _listing('%s %d' % (key, self.vanilla[key]) for key in sorted(self.vanilla))
        markers = _listing('%s %d' % (key, self.markers[key]) for key in sorted(self.markers))

        totals = SUMMARY_LINE % values
        detail = DETAIL_LINE % (
            markers,
            self.batches,
            values['damaging_hits'],
            self.events['crits'],
            self.events['kills'],
            vanilla,
            hooks,
        )
        return totals, detail


def _event_key(event, keys_by_kind, is_enemy):
    key = keys_by_kind.get(call(event, 'getBattleEventType'))
    if key in ENEMY_ONLY_KEYS and not is_enemy(call(event, 'getTargetID')):
        return None
    return key


def _event_amount(event, key):
    extra = call(event, 'getExtra')
    if key in DAMAGE_KEYS:
        return extra_amount(extra)
    if key in CRIT_KEYS:
        return extra_amount(extra, 'getCritsCount')
    return 1


def _listing(items):
    return ', '.join(items) or 'none'
