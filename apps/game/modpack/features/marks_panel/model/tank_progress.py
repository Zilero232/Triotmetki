# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import counted, format_number
from ....core.moe import mastery_state
from .cells import cell
from .constants import ACE_LEVEL, APPROX, METRIC_SEPARATOR, RESEARCH_ROWS


def _badge(level, translate):
    return translate('marks_panel_card_mastery_%d' % level)


def _next_badge(badges):
    for badge in badges:
        if not badge['reached']:
            return badge
    return None


def _badges_line(badges, translate):
    parts = [u'%s %s' % (_badge(badge['level'], translate), format_number(badge['xp'])) for badge in badges]
    return METRIC_SEPARATOR.join(parts)


def _badge_label(level, translate):
    badge = _badge(level, translate)
    return badge if level == ACE_LEVEL else translate('marks_panel_card_badge', badge=badge)


def mastery_cell(levels, own_level, translate):
    badges = mastery_state(levels, own_level)
    if not badges:
        return None
    badge = _next_badge(badges)
    if badge is None:
        return cell(_badge_label(badges[-1]['level'], translate), translate('marks_panel_card_reached'), tone='good')
    note = translate('marks_panel_card_per_battle')
    return cell(_badge_label(badge['level'], translate), format_number(badge['xp']), note)


def mastery_line(levels, own_level, translate):
    badges = mastery_state(levels, own_level)
    if not badges:
        return None
    return u'%s: %s' % (translate('marks_panel_card_mastery_xp'), _badges_line(badges, translate))


def _battles(battles, translate):
    return APPROX + counted(battles, 'battles', translate) if battles else None


def _need(need, translate):
    return format_number(need) if need else translate('marks_panel_card_research_ready')


def research_cells(research, translate):
    if research is None:
        return []
    cells = []
    if research['elite'] is not None:
        note = _battles(research['elite_battles'], translate)
        cells.append(cell(translate('marks_panel_card_to_elite'), _need(research['elite'], translate), note))
    for vehicle in research['vehicles'][:RESEARCH_ROWS]:
        label = translate('marks_panel_card_research_vehicle', vehicle=vehicle['name'])
        cells.append(cell(label, _need(vehicle['need'], translate), _battles(vehicle['battles'], translate)))
    return cells


def _research_part(label, need, battles, translate):
    battles_text = _battles(battles, translate)
    text = u'%s %s' % (label, _need(need, translate))
    return u'%s (%s)' % (text, battles_text) if battles_text else text


def research_line(research, translate):
    if research is None:
        return None
    parts = []
    if research['elite'] is not None:
        label = translate('marks_panel_card_to_elite')
        parts.append(_research_part(label, research['elite'], research['elite_battles'], translate))
    for vehicle in research['vehicles'][:RESEARCH_ROWS]:
        parts.append(_research_part(vehicle['name'], vehicle['need'], vehicle['battles'], translate))
    return METRIC_SEPARATOR.join(parts) or None
