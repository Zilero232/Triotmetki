# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import clean_text, int_or_none
from ....core.format import COLOR_MUTED, COLOR_NEUTRAL, COLOR_UP, font, format_number
from .battles import battle_lines
from .constants import DIVISION_LETTERS, LEGEND_RANK, MAX_SKILL, RANK_IDS, THRESHOLD_RANKS, TITLE_SIZE_STEP

# Fair play: only what the Onslaught hangar already shows the player: their own division, the division ranges of the
# client's rank tooltips and the role skill chosen for the selected vehicle. Nothing about other players. The own rating
# and division are left to the stock Onslaught header, which shows them (docs/research/competitors/
# 2026-10-05-stock-replacement.md).


def clean_division(item):
    if not isinstance(item, dict):
        return None
    rank = int_or_none(item.get('rank'))
    index = int_or_none(item.get('index'))
    begin = int_or_none(item.get('begin'), 0)
    if rank not in RANK_IDS or index not in DIVISION_LETTERS or begin is None:
        return None
    elite_percent = int_or_none(item.get('elite_percent'), 0) or 0
    return {'rank': rank, 'index': index, 'begin': begin, 'elite_percent': elite_percent}


def division_key(step):
    return step['rank'], -step['index']


def clean_state(raw):
    if not isinstance(raw, dict):
        return None
    divisions = [clean_division(item) for item in raw.get('divisions') or ()]
    return {
        'division': clean_division(raw.get('division')),
        'divisions': sorted((step for step in divisions if step), key=division_key),
        'qualification': bool(raw.get('qualification')),
        'skill': clean_text(raw.get('skill'), MAX_SKILL),
    }


def division_name(step, translate):
    return u'%s %s' % (translate('comp7_helper_rank_%d' % step['rank']), DIVISION_LETTERS[step['index']])


def threshold_status(step, state):
    current = state['division']
    if current is None or state['qualification']:
        return 'idle'
    if division_key(step) == division_key(current):
        return 'active'
    if division_key(step) < division_key(current):
        return 'done'
    return 'idle'


def thresholds(state):
    return [(step, threshold_status(step, state)) for step in state['divisions'] if step['rank'] in THRESHOLD_RANKS]


def threshold_value(step, translate):
    value = translate('comp7_helper_from', points=format_number(step['begin']))
    if step['rank'] == LEGEND_RANK and step['elite_percent']:
        return u'%s · %s' % (value, translate('comp7_helper_top', percent=step['elite_percent']))
    return value


def format_hangar(state, settings, translate):
    if state is None:
        return None
    size = settings.get('font_size')
    lines = []
    if settings.get('show_thresholds'):
        for step, status in thresholds(state):
            line = u'%s: %s' % (division_name(step, translate), threshold_value(step, translate))
            lines.append(font(line, COLOR_UP if status != 'idle' else COLOR_MUTED, size))
    if settings.get('show_skill') and state['skill']:
        lines.append(font(translate('comp7_helper_skill_line', skill=state['skill']), COLOR_MUTED, size))
    if settings.get('show_battles'):
        lines.extend(font(line, COLOR_MUTED, size) for line in battle_lines(state.get('battles') or [], translate))
    if not lines:
        return None
    title = font(translate('comp7_helper_card_title'), COLOR_NEUTRAL, size + TITLE_SIZE_STEP)
    return u'\n'.join([title] + lines)
