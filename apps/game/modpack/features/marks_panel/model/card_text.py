# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.format import COLOR_MUTED, COLOR_NEUTRAL, counted, font, format_number, format_percent
from ....core.templates import render
from . import macro_values
from .card import shows_detail, shows_ratings
from .constants import DELTA_COLORS, LINE_SEPARATOR, METRIC_SEPARATOR, TARGET_SEPARATOR
from .page import delta_sign, signed_percent
from .tank_progress import mastery_line, research_line

# The Tank card as GUIFlash text, for the renderer without the Gameface page: the same parts as the widget
# (model/card.py), one line each.


def _labelled_delta(label, value):
    return u'%s %s' % (font(label, COLOR_MUTED), font(signed_percent(value), DELTA_COLORS[delta_sign(value)]))


def _has_trend(summary):
    return summary is not None and summary.get('last_delta') is not None


def _trend_line(summary, translate):
    parts = [_labelled_delta(translate('marks_panel_card_last'), summary['last_delta'])]
    if summary.get('trend') is not None and summary.get('trend_battles', 0) > 1:
        battles = counted(summary['trend_battles'], 'battles', translate)
        parts.append(_labelled_delta(translate('marks_panel_card_trend', battles=battles), summary['trend']))
    return METRIC_SEPARATOR.join(parts)


def _targets_line(state, values, translate):
    template = translate('marks_panel_line_target')
    macros = [{'level': u'%d' % level, 'need': values['need%d' % level]} for level in sorted(state['need'])]
    return TARGET_SEPARATOR.join(render(template, level_macros) for level_macros in macros)


def _ratings_line(tank, translate):
    rating = tank.get('wn8')
    parts = []
    if isinstance(rating, dict) and is_number(rating.get('value')):
        parts.append(translate('marks_panel_card_ratings') + u' ' + format_number(rating['value']))
    if is_number(tank.get('win_rate')):
        parts.append(translate('marks_panel_card_win_rate', value=format_percent(tank['win_rate'])))
    if tank.get('battles'):
        parts.append(counted(tank['battles'], 'battles', translate))
    return METRIC_SEPARATOR.join(parts)


def _marks_lines(data, settings, translate):
    state = data.state
    values = macro_values(state, translate)
    size = settings.get('font_size')
    lines = [font(render(translate('marks_panel_card_line_head'), values), COLOR_NEUTRAL, size)]
    if settings.get('show_trend') and _has_trend(data.summary):
        lines.append(_trend_line(data.summary, translate))
    lines.append(font(render(translate('marks_panel_card_line_average'), values), COLOR_NEUTRAL, size))
    if not state['has_curve']:
        lines.append(font(translate('marks_panel_card_no_curve'), COLOR_MUTED, size))
        return lines
    lines.append(font(_targets_line(state, values, translate), COLOR_NEUTRAL, size))
    if state['next_level'] is not None:
        lines.append(font(render(translate('marks_panel_card_line_forecast'), values), COLOR_MUTED, size))
    return lines


def _progress_lines(data, settings, translate):
    lines = []
    if settings.get('show_mastery'):
        lines.append(mastery_line(data.mastery, data.own_mastery, translate))
    if settings.get('show_research'):
        lines.append(research_line(data.research, translate))
    return lines


def card_text(data, settings, translate):
    size = settings.get('font_size')
    if data.state is not None:
        lines = _marks_lines(data, settings, translate)
    else:
        lines = [font(data.vehicle or translate('marks_panel_title'), COLOR_NEUTRAL, size)]
    if not shows_detail(data, settings):
        return LINE_SEPARATOR.join(lines)
    if shows_ratings(data, settings):
        lines.append(font(_ratings_line(data.tank, translate), COLOR_MUTED, size))
    lines.extend(font(line, COLOR_MUTED, size) for line in _progress_lines(data, settings, translate) if line)
    return LINE_SEPARATOR.join(lines)
