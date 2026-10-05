# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.format import counted
from ....core.classes import class_key
from ....core.hud.icons import mark_icon
from ....core.hud.widget import widget
from ....core.moe import MARK_LEVELS, moe_macros
from ....core.templates import render
from . import target_levels
from .constants import (
    APPROX,
    BAR_DAMAGE,
    CURVE_ESTIMATED,
    DEFAULT_SHAPE,
    KIND,
    LOOK_BOX,
    LOOK_SILHOUETTE,
    MARK_TONES,
    MAX_STARS,
    NO_ROWS,
    SOURCE_ESTIMATED,
)

# Fair play: the player's own marks of excellence, from the own dossier and the own damage and assist of this battle.
#
# The plate (docs/specs/2026-09-30-hud-consolidation-and-design.md §8.4) as the gunmarks panels of PROTanki, Near_You
# and Lebwa lay it out: the percent after the battle with its change, the bar of this battle's damage against the
# average that holds the percent (the gunmarks «damage progress» bar, or the 0-100 % scale), the damage dealt against
# that average and the damage for the next goal; in the extended style or while Alt is held, the thresholds row and the
# average row under it. The page draws the rows it gets; the style only tells it a custom template's text from the
# plate. The `look` picks the plate: the framed box with its bar, or the own tank's contour filled to the percent; both
# mark the gun's marks as stars.


def _shown_percent(state):
    shown = state['projected'] if is_number(state['projected']) else state['percent']
    if not is_number(shown):
        return None
    return round(shown, 2)


# The design brief keeps the big percent white unless it is coloured by the mark: the change mode colours only the
# change beside it, which the page tones by its own sign.
def percent_tone(state, mode):
    if mode != 'mark':
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
    if settings.get('style') == 'minimal' or not state['has_curve']:
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


def _battles(state, settings, translate):
    if not settings.get('show_battles') or state['next_level'] is None or state['battles'] is None:
        return None
    return {'level': state['next_level'], 'text': APPROX + counted(state['battles'], 'battles', translate)}


def _is_estimate(state):
    return state['source'] == SOURCE_ESTIMATED or state.get('curve') == CURVE_ESTIMATED


def _rows(state, settings, translate):
    return {
        'thresholds': thresholds(state) if settings.get('show_targets') else [],
        'step': _step(state, settings),
        'average': _average(state, settings, translate),
        'battles': _battles(state, settings, translate),
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
    return _rows(state, settings, translate) if style == 'extended' else NO_ROWS


def _style(settings):
    style = settings.get('style')
    if style == 'custom' and not settings.get('template'):
        return 'extended'
    return style


def _look(settings):
    return settings.look() if hasattr(settings, 'look') else LOOK_BOX


def _stars(state):
    marks = state['marks']
    return int(max(0, min(MAX_STARS, marks))) if is_number(marks) else 0


def _next_mark(state):
    if not state['has_curve'] or state['next_level'] is None:
        return None
    need = state['need_next']
    return {'level': state['next_level'], 'need': need if is_number(need) else None}


# The battle's combined damage against the average the percent follows: above it the percent rises.
def _damage(state, translate):
    if not state['has_curve']:
        return None
    return {'label': translate('marks_panel_damage_short'), 'value': state['damage'], 'target': state['ema']}


def marks_widget(state, settings, translate, class_tag=None):
    style = _style(settings)
    look = _look(settings)
    goal = _goal(state, settings)
    data = {
        'look': look,
        'stars': _stars(state),
        'silhouette': (class_key(class_tag) or DEFAULT_SHAPE) if look == LOOK_SILHOUETTE else None,
        'next': _next_mark(state),
        'damage': _damage(state, translate),
        'style': style,
        'has_curve': bool(state['has_curve']),
        'percent': _shown_percent(state),
        'delta': state['delta'] if style != 'custom' else None,
        'estimated': _is_estimate(state),
        'mark': mark_icon(state['marks']),
        'tone': percent_tone(state, settings.get('color_mode')),
        'goal': goal,
        'bar': _bar(state, goal, settings) if style != 'custom' else None,
        'to': translate('marks_panel_to'),
        'note': None,
        'text': render(settings.get('template'), moe_macros(state)) if style == 'custom' else None,
    }
    data.update(_detail_rows(state, style, settings, translate))
    return widget(KIND, data)
