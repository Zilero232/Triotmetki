# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import is_number
from ..format import COLOR_DOWN, COLOR_MUTED, COLOR_NEUTRAL, COLOR_UP, MARK_COLORS, format_number
from .constants import (
    COLOR_MODE_MARK,
    COLOR_MODE_OFF,
    MACRO_MISSING,
    MARK_LEVELS,
    REACHED,
    STAR,
    TARGET_LEVELS,
    UNREACHABLE,
)


def _percent(value):
    return u'%.2f' % value if is_number(value) else MACRO_MISSING


def _signed(value):
    return u'%+.2f' % value if is_number(value) else MACRO_MISSING


def _need(value):
    if not is_number(value):
        return MACRO_MISSING
    return REACHED if value <= 0 else format_number(value)


def _whole(value):
    return u'%d' % value if value is not None else MACRO_MISSING


def _target(state, level):
    if level not in state['target_avg']:
        return MACRO_MISSING
    return format_number(state['target_avg'][level])


def _battles(state):
    if not state['has_curve'] or state['next_level'] is None:
        return MACRO_MISSING
    if state['battles'] is not None:
        return format_number(state['battles'])
    return MACRO_MISSING if state['pace'] is None else UNREACHABLE


def moe_macros(state):
    """The `{macro}` values of the marks templates as text (README «marks_panel» lists them)."""
    marks = state['marks'] if is_number(state['marks']) else None
    values = {
        'percent': _percent(state['percent']),
        'projected': _percent(state['projected']),
        'delta': _signed(state['delta']),
        'damage': format_number(state['damage']),
        'ema': format_number(state['ema']),
        'ema_projected': format_number(state['ema_projected']),
        'marks': _whole(marks),
        'stars': STAR * int(marks) if marks is not None else u'',
        'next': _whole(state['next_level']),
        'need_next': _need(state['need_next']),
        'target_next': _target(state, state['next_level']),
        'step': u'%g' % state['step'] if is_number(state['step']) else MACRO_MISSING,
        'step_need': _need(state['step_need']),
        'up': _whole(state['up_level']),
        'need_up': _need(state['up_need']),
        'battles': _battles(state),
        'pace': format_number(state['pace']) if state['pace'] is not None else MACRO_MISSING,
    }
    for level in (int(value) for value in TARGET_LEVELS):
        values['need%d' % level] = _need(state['need'].get(level))
        values['target%d' % level] = _target(state, level)
    return values


def _mark_color(state):
    shown = state['projected'] if is_number(state['projected']) else state['percent']
    if not is_number(shown):
        return COLOR_MUTED
    reached = len([level for level in MARK_LEVELS if shown >= level])
    return MARK_COLORS[reached]


def moe_color(state, mode):
    """The colour of a marks view: by the change (`delta`), by the mark the percent is at (`mark`), or none."""
    if mode == COLOR_MODE_OFF:
        return COLOR_NEUTRAL
    if mode == COLOR_MODE_MARK:
        return _mark_color(state)
    delta = state['delta']
    if not is_number(delta) or delta == 0:
        return COLOR_NEUTRAL
    return COLOR_UP if delta > 0 else COLOR_DOWN
