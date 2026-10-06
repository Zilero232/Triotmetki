from __future__ import absolute_import, division, print_function, unicode_literals

import functools
import itertools

from ....core.compat import is_number, to_text
from ....core.hud.icons import CLASS_GLYPHS
from ....core.vendor import attr
from ..settings.constants import STYLE_MINIMAL
from .constants import (
    BLOCKED_OUTCOMES,
    COMPACT_STYLES,
    KIND_CRIT,
    KINDS,
    MAX_ENTRIES,
    MINIMAL_TOTALS,
    SECTIONS,
    SUMMARY_KEYS,
    TOTALS,
)
from .received import ReceivedLog
from .shots import ShotLog, positive_int


# `vehicle_id`, `vehicle` and `vehicle_class` are the target of the player's own damage and assist, the attacker of a
# hit on the player (the target id of the stock feedback events, RU 1.45 feedback_adaptor).
@attr.s
class Hit(object):

    vehicle_id = attr.ib(default=None)
    vehicle = attr.ib(default=None)
    vehicle_class = attr.ib(default=None)
    shell = attr.ib(default=None)
    gold = attr.ib(default=False)
    source = attr.ib(default=None)
    at = attr.ib(default=None)


class DamageLog(object):

    def __init__(self):
        self.sequence = itertools.count(1)
        self.totals = {kind: 0 for kind in KINDS}
        self.counts = {kind: 0 for kind in KINDS}
        self.summary = {}
        self.assists = []
        self.shots = ShotLog(self.sequence)
        self.received = ReceivedLog(self.sequence)

    def add(self, kind, amount, hit=None):
        if kind not in KINDS or positive_int(amount) is None:
            return False

        recorders = {
            'damage': self.shots.add_damage,
            'blocked': self.received.add_blocked,
            'received': self.received.add_damage,
        }
        record = recorders.get(kind, functools.partial(self._add_assist, kind))
        if not record(amount, hit or Hit()):
            return False

        self.totals[kind] += int(amount)
        self.counts[kind] += 1
        return True

    def add_crits(self, kind, count, hit):
        if kind == KIND_CRIT:
            return self.shots.add_crits(hit.vehicle_id, count, hit.at)
        return self.received.add_crits(hit, count)

    def _add_assist(self, kind, amount, hit):
        self.assists.append({
            'seq': next(self.sequence),
            'kind': kind,
            'damage': int(amount),
            'vehicle': to_text(hit.vehicle) if hit.vehicle else None,
            'class': hit.vehicle_class if hit.vehicle_class in CLASS_GLYPHS else None,
        })
        del self.assists[:-MAX_ENTRIES]
        return True

    def assist_rows(self):
        return [dict(entry, id='a%d' % entry['seq']) for entry in reversed(self.assists)]

    def apply_summary(self, damage=None, assist=None, blocked=None, stun=None):
        changed = False
        for key, value in zip(SUMMARY_KEYS, (damage, assist, blocked, stun)):
            if is_number(value) and value >= 0 and self.summary.get(key) != int(value):
                self.summary[key] = int(value)
                changed = True
        return changed

    def values(self):
        totals = self.totals
        summary = self.summary
        stun = max(totals['stun'], summary.get('stun', 0))
        assist = max(totals['radio'] + totals['track'], summary.get('assist', 0))
        return {
            'dealt': max(totals['damage'], summary.get('damage', 0)),
            'blocked': max(totals['blocked'], summary.get('blocked', 0)),
            'assist': assist,
            'stun': stun,
            'assisted': assist + stun,
            'assist_radio': totals['radio'],
            'assist_track': totals['track'],
            'assist_stun': stun,
            'received': totals['received'],
            'hits': self.counts['damage'],
            'blocked_hits': self.counts['blocked'],
            'received_hits': self.counts['received'],
        }


def shown_sections(settings):
    return SECTIONS.get(settings.get('sections'), SECTIONS['both'])


def _is_shown_total(key, section, settings):
    if section not in shown_sections(settings):
        return False
    return settings.get('style') != STYLE_MINIMAL or key in MINIMAL_TOTALS


# A total is shown once it is above zero; before anything counts, the first total the settings show stands at zero, so
# the panel is on screen from the start in place of the stock damage log it hides (whose totals show from the start).
def shown_totals(log, settings):
    values = log.values()
    shown = [(key, values[key]) for key, section in TOTALS if _is_shown_total(key, section, settings)]
    counted = [(key, value) for key, value in shown if value > 0]
    return counted or shown[:1]


def shows_rows(settings):
    return settings.get('style') not in COMPACT_STYLES


def _with_target(row, targets):
    target = targets.get(row['target']) or {}
    row = dict(row, kind='damage', max=target.get('max'))
    row['class'] = target.get('class')
    return row


def _shot_rows(log, settings):
    rows = log.shots.grouped_rows() if settings.get('group_by_target') else log.shots.rows()
    if not settings.get('show_misses'):
        rows = [row for row in rows if row['damage']]
    return [_with_target(row, log.shots.targets) for row in rows]


def dealt_rows(log, settings):
    rows = _shot_rows(log, settings)
    if settings.get('show_assist_rows'):
        rows.extend(log.assist_rows())

    rows.sort(key=lambda row: row['seq'], reverse=True)
    return rows[:settings.get('dealt_lines')]


def received_rows(log, settings):
    rows = log.received.rows()
    if not settings.get('show_received_blocked'):
        rows = [row for row in rows if row['outcome'] not in BLOCKED_OUTCOMES]

    for row in rows:
        row['kind'] = 'blocked' if row['outcome'] in BLOCKED_OUTCOMES else 'received'
    return rows[:settings.get('received_lines')]


def section_rows(log, settings):
    shown = shown_sections(settings) if shows_rows(settings) else ()
    return {
        'dealt': dealt_rows(log, settings) if 'dealt' in shown else [],
        'received': received_rows(log, settings) if 'received' in shown else [],
    }
