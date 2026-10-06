from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, is_number, string_types, to_text
from ....core.format import format_number
from ....core.me import owned
from .constants import ANALYSIS_FINAL, ANALYSIS_IDS_PER_READ, ANALYSIS_WATCH_S, PARSED

HIGHLIGHT_CHECKS = (
    ('accuracy', is_number),
    ('damage', is_int),
    ('penetrations', is_int),
)


def _is_status_row(row):
    if not isinstance(row, dict):
        return False
    return isinstance(row.get('id'), string_types) and isinstance(row.get('status'), string_types)


def _highlights(row):
    raw = row.get('highlights')
    if not isinstance(raw, dict):
        raw = {}
    highlights = {}
    for key, is_valid in HIGHLIGHT_CHECKS:
        value = raw.get(key)
        highlights[key] = value if is_valid(value) else None
    return highlights


def parse_statuses(data, account_id):
    if not owned(data, account_id) or not isinstance(data.get('replays'), list):
        return {}
    statuses = {}
    for row in data['replays']:
        if _is_status_row(row):
            statuses[to_text(row['id'])] = (to_text(row['status']), _highlights(row))
    return statuses


class AnalysisWatch(object):

    def __init__(self):
        self.pending = {}
        self.parsed = set()

    def add(self, replay_id, now):
        if isinstance(replay_id, string_types) and replay_id and replay_id not in self.parsed:
            self.pending[to_text(replay_id)] = now

    def due(self, now):
        for replay_id, uploaded_at in list(self.pending.items()):
            if now - uploaded_at > ANALYSIS_WATCH_S:
                del self.pending[replay_id]
        oldest_first = sorted(self.pending, key=self.pending.get)
        return oldest_first[:ANALYSIS_IDS_PER_READ]

    def apply(self, statuses):
        finished = []
        for replay_id, (status, highlights) in statuses.items():
            if replay_id not in self.pending or status not in ANALYSIS_FINAL:
                continue
            del self.pending[replay_id]
            if status == PARSED:
                self.parsed.add(replay_id)
                finished.append((replay_id, highlights))
        return finished


def analysis_notice(highlights, translate):
    details = []
    if highlights.get('accuracy') is not None:
        accuracy = int(round(highlights['accuracy']))
        details.append(translate('replay_manager_analysis_accuracy', accuracy=accuracy))
    if highlights.get('damage') is not None:
        damage = format_number(highlights['damage'])
        details.append(translate('replay_manager_analysis_damage', damage=damage))
    if highlights.get('penetrations') is not None:
        details.append(translate('replay_manager_analysis_penetrations', penetrations=highlights['penetrations']))

    if not details:
        return translate('replay_manager_analysis_plain')
    return translate('replay_manager_analysis_ready', details=', '.join(details))
