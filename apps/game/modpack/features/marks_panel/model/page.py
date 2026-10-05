# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import counted, format_epoch, format_number
from .constants import (
    ACTION_CLEAR,
    ENTRY_MOMENT_FORMAT,
    MAX_DETAIL_LINES,
    NO_VALUE,
    PERCENT_FORMAT,
    SITE_PROGRESS_PATH,
    SOURCE_BATTLE,
    STAR,
)
from .history import percent, rating_delta, start_of
from .report import marks_report

# The marks history page of the mod window: one row per tank, newest first, with its entries and the report.


def signed_percent(value):
    if value is None:
        return u''
    if value > 0:
        return u'+' + PERCENT_FORMAT % value
    return PERCENT_FORMAT % value


def percent_text(value):
    if value is None:
        return None
    return PERCENT_FORMAT % value


def delta_sign(value):
    if value > 0:
        return 1
    if value < 0:
        return -1
    return 0


def stars(marks):
    if not marks:
        return NO_VALUE
    return STAR * marks


def _source_text(entry, translate):
    if entry.get('source') == SOURCE_BATTLE:
        return translate('marks_panel_history_battle', damage=format_number(entry.get('combined')))
    return translate('marks_panel_history_hangar')


def _entry_line(before, entry, translate):
    moment = format_epoch(entry.get('t'), ENTRY_MOMENT_FORMAT) or u''
    value = percent(entry.get('rating'))
    text = moment if value is None else u'%s  %s' % (moment, percent_text(value))
    delta = rating_delta(before, entry)
    if delta is not None:
        text += u' (%s)' % signed_percent(delta)
    return text + u', ' + _source_text(entry, translate)


def _reached_rows(vehicle, translate):
    reached = vehicle.get('reached') or {}
    rows = []
    for mark in sorted(reached, key=int):
        label = translate('marks_panel_history_reached', mark=mark)
        rows.append({'label': label, 'value': format_epoch(reached[mark]) or u''})
    return rows


def _entry_rows(vehicle, translate):
    entries = vehicle.get('entries') or []
    start = max(0, len(entries) - MAX_DETAIL_LINES)
    rows = []
    for index in reversed(range(start, len(entries))):
        rows.append({'label': u'', 'value': _entry_line(start_of(entries, index), entries[index], translate)})
    return rows


def detail_rows(vehicle, translate):
    return _reached_rows(vehicle, translate) + _entry_rows(vehicle, translate)


def _subtitle(summary, translate):
    subtitle = u'%s  %s' % (percent_text(summary['percent']) or NO_VALUE, stars(summary['marks']))
    if summary.get('avg'):
        subtitle += u'  ' + translate('marks_panel_history_avg', avg=format_number(summary['avg']))
    return subtitle


def _meta(summary, translate):
    meta = format_epoch(summary.get('updated')) or u''
    trend = summary.get('trend')
    if trend is None:
        return meta
    battles = counted(summary['trend_battles'], 'battles', translate)
    return meta + u' / ' + translate('marks_panel_history_trend', battles=battles, delta=signed_percent(trend))


def _clear_action(tank_id, summary, translate):
    confirm = translate('marks_panel_history_clear_confirm', vehicle=summary['label'] or tank_id)
    return {'id': ACTION_CLEAR, 'label': translate('marks_panel_history_clear'), 'confirm': confirm}


def row_of(tank_id, vehicle, summary, translate):
    return {
        'id': str(tank_id),
        'title': summary['label'] or str(tank_id),
        'subtitle': _subtitle(summary, translate),
        'meta': _meta(summary, translate),
        'badge': signed_percent(summary['last_delta']) or None,
        'link': None,
        'details': detail_rows(vehicle, translate),
        'report': marks_report(int(tank_id), vehicle),
        'actions': [_clear_action(tank_id, summary, translate)],
    }


def build_page(history, translate, trend_battles, max_rows):
    rows = []
    for tank_id in history.ordered()[:max_rows]:
        summary = history.summary(tank_id, trend_battles)
        if summary is not None:
            rows.append(row_of(tank_id, history.vehicle(tank_id), summary, translate))
    return {'kind': 'list', 'empty': translate('marks_panel_history_empty'), 'rows': rows}


def page_actions(translate):
    return [{'id': 'site', 'label': translate('marks_panel_history_site'), 'link': SITE_PROGRESS_PATH, 'confirm': None}]
