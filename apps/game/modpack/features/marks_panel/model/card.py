# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, is_number
from ....core.format import counted, format_number
from ....core.hud.icons import class_icon
from ....core.hud.widget import widget
from ....core.moe import TARGET_LEVELS
from ....core.vendor import attr
from .constants import (
    APPROX,
    DELTA_TONES,
    MAX_STARS,
    TANK_CARD_KIND,
    TIER_COLORS,
)
from .cells import cell, cell_percent
from .page import delta_sign
from .tank_progress import mastery_cell, research_cells

# Fair play: the player's own marks of the selected tank (own dossier, own average and pace, own battles kept on this
# computer) and the bound account's own ratings of that tank from the site.
#
# The Tank card as the hangar marks cards of the packs lay it out (Jove's and Lebwa's marks info, Battle Observer's
# hangar widget, XVM's hangar macros): the tank with its tier and class and the marks on its gun, the percent big with
# its last change and the trend of the last battles beside it, the bar of the four mark steps (0-65-85-95-100 %) with
# the average each level needs, and the damage one battle needs for the next mark with the battles to it at the pace.
# The extended style (or Alt) adds the two-column grid: the average, the pace, the damage to the next whole percent and
# the trend; the tank's site WN8, wins and mastery badge; the XP to elite and to the next tanks.


# What the card shows: the hangar marks `state` (hangar_state; None for a tank without marks, below tier 5, whose card
# keeps the tank's grid), the `vehicle` name, the marks history `summary` of the tank and its site ratings row `tank`
# (either None when unknown), and whether Alt is `held`; for the grid the site's `mastery` badges XP
# (core.moe.mastery_from_api) with the dossier's `own_mastery`, and the `research` state (model/research.py); the
# vehicle's `class_tag` and `tier` for the header.
@attr.s(frozen=True)
class TankCard(object):

    state = attr.ib()
    vehicle = attr.ib(default=None)
    summary = attr.ib(default=None)
    tank = attr.ib(default=None)
    held = attr.ib(default=False)
    mastery = attr.ib(default=None)
    own_mastery = attr.ib(default=None)
    research = attr.ib(default=None)
    class_tag = attr.ib(default=None)
    tier = attr.ib(default=None)


# A tank without marks has only the grid, so it shows at rest.
def shows_detail(data, settings):
    return data.held or data.state is None or settings.get('style') == 'extended'


def shows_ratings(data, settings):
    return data.tank is not None and bool(settings.get('show_tank_ratings'))


# The percent after each of the last battles, oldest first, walked back from today's percent by the battles' changes.
def percent_history(percent, deltas):
    points = [percent]
    for delta in reversed(deltas or ()):
        points.insert(0, points[0] - delta)
    return [round(min(100.0, max(0.0, point)), 2) for point in points] if len(points) > 1 else []


def _percent(state):
    if state is None or not is_number(state['percent']):
        return None
    return round(state['percent'], 2)


def _marks(state):
    marks = state['marks'] if state is not None else None
    return int(max(0, min(MAX_STARS, marks))) if is_number(marks) else 0


def _last_delta(summary):
    if summary is None or not is_number(summary.get('last_delta')):
        return None
    return round(summary['last_delta'], 2)


def _points(data, settings):
    percent = _percent(data.state)
    if percent is None or data.summary is None or not settings.get('show_trend'):
        return []
    return percent_history(percent, data.summary.get('deltas'))


# Each level of the bar with the average it needs (the site's thresholds), 100% included when the site has it.
def _thresholds(state):
    if state is None or not state['has_curve']:
        return []
    levels = []
    for level in (int(value) for value in TARGET_LEVELS):
        average = state['target_avg'].get(level)
        if average is not None:
            levels.append({'level': level, 'average': format_number(average), 'reached': state['need'].get(level) == 0})
    return levels


def _goal_level(state):
    if state['next_level'] is not None:
        return state['next_level']
    need = state['need'].get(100)
    return 100 if is_number(need) and need > 0 else None


def _battles(state, level, translate):
    if level != state['next_level'] or not state['battles']:
        return None
    return APPROX + counted(state['battles'], 'battles', translate)


# The damage one battle needs for the next mark (100% once the three are on the gun) and the battles to it at the pace.
def _goal(state, translate):
    if state is None or not state['has_curve']:
        return None
    level = _goal_level(state)
    if level is None:
        return {'label': translate('marks_panel_card_all_marks'), 'value': None, 'note': None, 'battles': None}
    return {
        'label': translate('marks_panel_card_forecast', next=u'%d' % level),
        'value': format_number(state['need'][level]),
        'note': translate('marks_panel_card_per_battle'),
        'battles': _battles(state, level, translate),
    }


def _note(state, translate):
    if state is None or state['has_curve']:
        return None
    return translate('marks_panel_card_no_curve')


def _average_cell(state, translate):
    target = state['target_avg'].get(state['next_level']) if state['next_level'] is not None else None
    note = translate('marks_panel_card_target', value=format_number(target)) if target is not None else None
    return cell(translate('marks_panel_card_average'), format_number(state['ema']), note)


def _up_cell(state, translate):
    if not state['has_curve'] or state['up_level'] is None:
        return None
    label = translate('marks_panel_card_up', up=u'%d' % state['up_level'])
    return cell(label, format_number(state['up_need']), translate('marks_panel_card_per_battle'))


def _trend_cell(summary, settings, translate):
    if not settings.get('show_trend') or summary is None or summary.get('trend') is None:
        return None
    if summary.get('trend_battles', 0) < 2:
        return None
    battles = counted(summary['trend_battles'], 'battles', translate)
    tone = DELTA_TONES[delta_sign(summary['trend'])]
    label = translate('marks_panel_card_trend', battles=battles)
    return cell(label, cell_percent(summary['trend'], signed=True), tone=tone)


def _marks_cells(data, settings, translate):
    state = data.state
    if state is None:
        return []
    pace = state['pace']
    return [
        _average_cell(state, translate),
        cell(translate('marks_panel_card_pace'), format_number(pace)) if pace is not None else None,
        _up_cell(state, translate),
        _trend_cell(data.summary, settings, translate),
    ]


def _rating_cell(tank, translate):
    rating = tank.get('wn8')
    if not isinstance(rating, dict) or not is_number(rating.get('value')):
        return None
    color = TIER_COLORS.get(rating.get('tier'))
    return cell(translate('marks_panel_card_ratings'), format_number(rating['value']), color=color)


def _wins_cell(tank, translate):
    if not is_number(tank.get('win_rate')):
        return None
    battles = counted(tank['battles'], 'battles', translate) if is_int(tank.get('battles')) else None
    return cell(translate('marks_panel_card_wins'), cell_percent(tank['win_rate']), battles)


def _tank_cells(data, settings, translate):
    cells = []
    if shows_ratings(data, settings):
        cells.extend([_rating_cell(data.tank, translate), _wins_cell(data.tank, translate)])
    if settings.get('show_mastery'):
        cells.append(mastery_cell(data.mastery, data.own_mastery, translate))
    return cells


def _section(title, cells):
    shown = [item for item in cells if item]
    return {'title': title, 'cells': shown} if shown else None


def card_sections(data, settings, translate):
    research = research_cells(data.research, translate) if settings.get('show_research') else []
    sections = [
        _section(translate('marks_panel_card_section_marks'), _marks_cells(data, settings, translate)),
        _section(translate('marks_panel_card_section_tank'), _tank_cells(data, settings, translate)),
        _section(translate('marks_panel_card_section_research'), research),
    ]
    return [section for section in sections if section]


def _hint(sections, settings, translate):
    if not sections or not settings.get('alt_detail'):
        return None
    return translate('marks_panel_card_alt_hint')


def _tier(tier):
    return int(tier) if is_int(tier) and tier > 0 else None


def tank_card(data, settings, translate):
    sections = card_sections(data, settings, translate)
    detail = shows_detail(data, settings)
    return widget(TANK_CARD_KIND, {
        'vehicle': data.vehicle,
        'tier': _tier(data.tier),
        'class_icon': class_icon(data.class_tag),
        'marks': _marks(data.state),
        'percent': _percent(data.state),
        'delta': _last_delta(data.summary),
        'points': _points(data, settings),
        'thresholds': _thresholds(data.state),
        'goal': _goal(data.state, translate),
        'note': _note(data.state, translate),
        'sections': sections if detail else [],
        'hint': None if detail else _hint(sections, settings, translate),
    })
