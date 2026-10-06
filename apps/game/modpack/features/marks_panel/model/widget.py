# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import clamp, is_number
from ....core.hud.icons import mark_icon
from ....core.hud.widget import widget
from ....core.moe import COLOR_MODE_MARK, MARK_LEVELS, moe_macros
from ....core.templates import render
from ..settings.constants import STYLE_CUSTOM, STYLE_EXTENDED, STYLE_MINIMAL
from . import target_levels
from .constants import (
    BAR_DAMAGE,
    CURVE_ESTIMATED,
    KIND,
    MARK_TONES,
    MAX_STARS,
    NO_ROWS,
    SOURCE_ESTIMATED,
)

# Fair play: the player's own marks of excellence, from the own dossier and the own damage and assist of this battle.
#
# Laid out as the gunmarks panels of PROTanki, Near_You and Lebwa are (docs/specs/2026-09-30-hud-consolidation-and-
# design.md §8.4). It never grows on its own (no Alt view), so its box is the one the player places; the battles to
# the next mark and the trend stay on the hangar Tank card, in battle the panel keeps to this battle.


def _shown_percent(state):
    shown = state['projected'] if is_number(state['projected']) else state['percent']
    if not is_number(shown):
        return None
    return round(shown, 2)


# The design brief keeps the big percent white unless it is coloured by the mark: the change mode colours only the
# change beside it, which the page tones by its own sign.
def percent_tone(state, mode):
    if mode != COLOR_MODE_MARK:
        return 'text'
    shown = _shown_percent(state)
    reached = len([level for level in MARK_LEVELS if is_number(shown) and shown >= level])
    return MARK_TONES[min(reached, len(MARK_TONES) - 1)]


def thresholds(state):
    items = []
    for level in target_levels(state):
        need = state['need'][level]
        items.append({'level': level, 'need': need, 'reached': need == 0})
    return items


def _goal(state, settings):
    if settings.get('style') == STYLE_MINIMAL or not state['has_curve']:
        return None
    if settings.get('show_up') and state['up_level'] is not None:
        return {'level': state['up_level'], 'need': state['up_need']}
    if state['next_level'] is None or state['need_next'] is None:
        return None
    return {'level': state['next_level'], 'need': state['need_next']}


# The battle's damage on a bar that ends at the damage the goal needs, with a tick where it holds the percent (the
# average): it moves with every own hit, as the gunmarks bar does, where the 0-100 % scale moves a pixel at most.
def _bar(state, goal, settings):
    if settings.get('bar') != BAR_DAMAGE or not state['has_curve']:
        return None
    damage = state['damage']
    end = damage + goal['need'] if goal is not None and is_number(goal['need']) else damage
    return {'value': damage, 'hold': state['ema'], 'end': max(end, state['ema'], 1)}


def _step(state, settings):
    if not settings.get('show_step') or state['step_need'] is None:
        return None
    return {'step': state['step'], 'need': state['step_need']}


def _average_row(state, translate):
    label = translate('marks_panel_average_short')
    return {'label': label, 'ema': state['ema'], 'ema_projected': state['ema_projected']}


def _average(state, settings, translate):
    if not settings.get('show_battle'):
        return None
    return _average_row(state, translate)


def _is_estimate(state):
    return state['source'] == SOURCE_ESTIMATED or state.get('curve') == CURVE_ESTIMATED


def _rows(state, settings, translate):
    return {
        'thresholds': thresholds(state) if settings.get('show_targets') else [],
        'step': _step(state, settings),
        'average': _average(state, settings, translate),
    }


# Without the site's thresholds the percent cannot be projected, but the average the percent follows can: the row of the
# damage average moving with the battle is the plate's live part then, and no thresholds row is drawn.
def _curveless_rows(state, translate):
    rows = dict(NO_ROWS)
    rows['average'] = _average_row(state, translate)
    return rows


def _detail_rows(state, style, settings, translate):
    if not state['has_curve']:
        return _curveless_rows(state, translate)
    if style != STYLE_EXTENDED:
        return NO_ROWS
    return _rows(state, settings, translate)


def _style(settings):
    style = settings.get('style')
    if style == STYLE_CUSTOM and not settings.get('template'):
        return STYLE_EXTENDED
    return style


def stars_of(state):
    marks = state['marks'] if state is not None else None
    if not is_number(marks):
        return 0
    return int(clamp(marks, 0, MAX_STARS))


def _damage(state, translate):
    if not state['has_curve']:
        return None
    return {'label': translate('marks_panel_damage_short'), 'value': state['damage'], 'target': state['ema']}


def marks_widget(state, settings, translate):
    style = _style(settings)
    is_custom = style == STYLE_CUSTOM
    goal = _goal(state, settings)
    data = {
        'stars': stars_of(state),
        'damage': _damage(state, translate),
        'style': style,
        'has_curve': bool(state['has_curve']),
        'percent': _shown_percent(state),
        'delta': None if is_custom else state['delta'],
        'estimated': _is_estimate(state),
        'mark': mark_icon(state['marks']),
        'tone': percent_tone(state, settings.get('color_mode')),
        'goal': goal,
        'bar': None if is_custom else _bar(state, goal, settings),
        'to': translate('marks_panel_to'),
        'note': None,
        'text': render(settings.get('template'), moe_macros(state)) if is_custom else None,
    }
    data.update(_detail_rows(state, style, settings, translate))
    return widget(KIND, data)
