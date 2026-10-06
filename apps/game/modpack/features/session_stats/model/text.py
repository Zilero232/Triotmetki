# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import (
    COLOR_MUTED,
    COLOR_NEUTRAL,
    COLOR_UP,
    counted,
    font,
    format_number,
    format_percent,
)
from .constants import CHANGE_COLORS, DONE_MARK, FACT_SEPARATOR, RESULT_COLORS, TITLE_SIZE
from .goals import is_done, progress
from .labels import account_facts, account_wn8, goal_label, goal_value, pending_caption
from .moe import signed_change

# The GUIFlash text of the Session card, for a client without the Gameface HUD page.


def _recent_line(recent, translate):
    marks = [font(translate('session_result_' + result), RESULT_COLORS[result]) for result in recent]

    return u'%s: %s' % (font(translate('session_recent'), COLOR_MUTED), u' '.join(marks))


def _number_rows(summary, translate):
    return (
        (translate('session_winrate'), format_percent(summary.get('win_rate'))),
        (translate('session_damage'), format_number(summary.get('avg_damage'))),
        (translate('session_wn8'), format_number(summary.get('wn8'))),
    )


def _goal_line(goal, translate, vehicle_name):
    label = font(goal_label(goal, translate, vehicle_name), COLOR_MUTED)
    if is_done(goal):
        return u'%s %s' % (label, font(DONE_MARK, COLOR_UP))

    state = goal_value(goal['metric'], goal.get('current'))
    share = progress(goal)
    if share is not None:
        state = u'%s (%d%%)' % (state, int(round(share * 100)))
    return u'%s %s' % (label, font(state, COLOR_NEUTRAL))


def _moe_line(entry, translate, vehicle_name):
    change = entry['change']
    sign = (change > 0) - (change < 0)
    color = CHANGE_COLORS[sign]
    head = font(u'%s %s' % (translate('session_moe'), vehicle_name or u''), COLOR_MUTED)
    return u'%s %s' % (head, font(signed_change(change), color))


def _account_line(overview, settings, translate):
    overall = overview.get('overall')
    if overall is None:
        return font(translate('session_account_no_data'), COLOR_MUTED)

    parts = [part for part in (account_wn8(overall, settings), account_facts(overall, settings, translate)) if part]
    if not parts:
        return None
    label = font(translate('session_account'), COLOR_MUTED)
    return u'%s: %s' % (label, font(FACT_SEPARATOR.join(parts), COLOR_NEUTRAL))


def _session_lines(summary, translate):
    if not summary.get('battles'):
        return []

    lines = [u'%s: %s' % (font(label, COLOR_MUTED), font(value, COLOR_NEUTRAL))
             for label, value in _number_rows(summary, translate)]
    recent = summary.get('recent')
    if recent:
        lines.append(_recent_line(recent, translate))
    return lines


def format_session_panel(view, settings, translate):
    summary = view.summary
    battles = counted(summary.get('battles') or 0, 'battles', translate)
    lines = [font(translate('session_title') + FACT_SEPARATOR + battles, COLOR_NEUTRAL, TITLE_SIZE)]

    pending = pending_caption(summary.get('pending'), translate)
    if pending:
        lines.append(font(pending, COLOR_MUTED))
    lines.extend(_session_lines(summary, translate))
    lines.extend(_moe_line(entry, translate, view.vehicle_names.get(entry['tank_id'])) for entry in view.moe)
    lines.extend(_goal_line(goal, translate, view.vehicle_names.get(goal.get('tank_id'))) for goal in view.goals)
    if view.overview is not None:
        lines.append(_account_line(view.overview, settings, translate))

    return u'\n'.join(line for line in lines if line)


def format_session_plain(summary, translate):
    battles = (translate('session_battles'), format_number(summary.get('battles') or 0))
    rows = (battles,) + _number_rows(summary, translate)
    pairs = [u'%s %s' % row for row in rows]
    return u'%s: %s' % (translate('session_title'), u', '.join(pairs))
