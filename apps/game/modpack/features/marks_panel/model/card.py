# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.classes import class_key
from ....core.compat import is_number
from ....core.format import COLOR_MUTED, COLOR_NEUTRAL, counted, font, format_number, format_percent
from ....core.hud.icons import glyph, mark_icon
from ....core.hud.widget import card, card_chip, card_hero, card_row
from ....core.moe import moe_macros
from ....core.templates import render
from ....core.vendor import attr
from . import macro_values
from .constants import (
    APPROX,
    CARD_WIDTH,
    DEFAULT_SHAPE,
    DELTA_COLORS,
    DELTA_GLYPHS,
    DELTA_TONES,
    LINE_SEPARATOR,
    METRIC_SEPARATOR,
    PERCENT_SUFFIX,
    TARGET_SEPARATOR,
    TIER_COLORS,
)
from .page import delta_sign, signed_percent
from .tank_progress import mastery_line, mastery_row, research_line, research_rows

# Fair play: the player's own marks of the selected tank (own dossier, own average and pace, own battles kept on this
# computer) and the bound account's own ratings of that tank from the site.
#
# The Tank card (docs/specs/2026-09-30-hud-consolidation-and-design.md §9.1): the percent big on the right, the
# average and the pace, the trend of the last battles, the damage per battle to each mark and the battles to the next;
# the tank's site ratings in the extended style or while Alt is held.


# What the card shows: the hangar marks `state` (hangar_state; None for a tank without marks, below tier 5, whose card
# keeps the ratings, mastery and research rows), the `vehicle` name, the marks history `summary` of the
# tank and its site ratings row `tank` (either None when unknown), and whether Alt is `held`; for the Alt rows the
# site's `mastery` badges XP (core.moe.mastery_from_api) with the dossier's `own_mastery`, and the `research` state
# (model/research.py).
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


# Every threshold the site has for the tank, 100% included: the card is where the player plans the next marks.
def card_levels(state):
    return sorted(state['need'])


def _rating_color(rating):
    if not isinstance(rating, dict):
        return None
    return TIER_COLORS.get(rating.get('tier'))


def _rating_value(rating):
    if not isinstance(rating, dict) or not is_number(rating.get('value')):
        return None
    return format_number(rating['value'])


def _tank_facts(tank, translate):
    facts = []
    if is_number(tank.get('win_rate')):
        facts.append(translate('marks_panel_card_win_rate', value=format_percent(tank['win_rate'])))
    if tank.get('battles'):
        facts.append(counted(tank['battles'], 'battles', translate))
    return METRIC_SEPARATOR.join(facts) or None


# A tank without marks has only the detail rows, so they show at rest.
def _shows_detail(data, settings):
    return data.held or data.state is None or settings.get('hangar_style') == 'extended'


def _shows_ratings(data, settings):
    if data.tank is None or not settings.get('show_tank_ratings'):
        return False
    return _shows_detail(data, settings)


def _progress_rows(data, settings, translate):
    rows = []
    if settings.get('show_mastery'):
        rows.append(mastery_row(data.mastery, data.own_mastery, translate))
    if settings.get('show_research'):
        rows.extend(research_rows(data.research, translate))
    return rows


def _ratings_row(data, translate):
    rating = data.tank.get('wn8')
    return card_row(
        translate('marks_panel_card_ratings'),
        _rating_value(rating),
        text_tone='muted',
        color=_rating_color(rating),
        detail=_tank_facts(data.tank, translate),
    )


def _delta_row(label, value):
    if value is None:
        return None
    sign = delta_sign(value)
    icon = glyph(DELTA_GLYPHS[sign])
    return card_row(label, signed_percent(value), icon=icon, tone_name=DELTA_TONES[sign], text_tone='muted')


def _has_trend(summary):
    return summary is not None and summary.get('last_delta') is not None


def _trend_rows(summary, translate):
    rows = [_delta_row(translate('marks_panel_card_last'), summary['last_delta'])]
    if summary.get('trend_battles', 0) > 1:
        battles = counted(summary['trend_battles'], 'battles', translate)
        rows.append(_delta_row(translate('marks_panel_card_trend', battles=battles), summary.get('trend')))
    return rows


def _target_row(level, state, translate):
    need = state['need'][level]
    label = u'%d%s' % (level, PERCENT_SUFFIX)
    if is_number(need) and need <= 0:
        return card_row(None, translate('marks_panel_card_reached'), label=label, status='done', tone_name='good')

    status = 'active' if level == state['next_level'] else 'idle'
    note = translate('marks_panel_card_per_battle')
    return card_row(None, format_number(need), label=label, status=status, note=note)


def _forecast_row(state, translate):
    if state['next_level'] is None or state['battles'] is None:
        return None
    text = translate('marks_panel_card_forecast', next=u'%d' % state['next_level'])
    battles = APPROX + counted(state['battles'], 'battles', translate)
    return card_row(text, battles, icon=glyph('target'), tone_name='gold')


def _marks_rows(data, settings, translate):
    state = data.state
    rows = _trend_rows(data.summary, translate) if settings.get('show_trend') and _has_trend(data.summary) else []
    if not state['has_curve']:
        rows.append(card_row(translate('marks_panel_card_no_curve'), status='idle', text_tone='muted'))
        return rows
    rows.extend(_target_row(level, state, translate) for level in card_levels(state))
    rows.append(_forecast_row(state, translate))
    return rows


def _rows(data, settings, translate):
    rows = _marks_rows(data, settings, translate) if data.state is not None else []
    if _shows_ratings(data, settings):
        rows.append(_ratings_row(data, translate))
    if _shows_detail(data, settings):
        rows.extend(_progress_rows(data, settings, translate))
    return rows


def _chips(state, translate):
    values = moe_macros(state)
    chips = [card_chip(values['ema'], glyph('damage'), 'text', translate('marks_panel_card_average'))]
    if state['pace'] is not None:
        chips.append(card_chip(values['pace'], glyph('trend_up'), 'text', translate('marks_panel_card_pace')))
    return chips


def _strip(summary, settings):
    if not settings.get('show_trend') or summary is None:
        return []
    return [DELTA_TONES[delta_sign(delta)] for delta in summary.get('deltas') or []]


def _footer(data, settings, translate):
    has_ratings = data.tank is not None and settings.get('show_tank_ratings')
    has_more = has_ratings or any(_progress_rows(data, settings, translate))
    if not has_more or _shows_detail(data, settings):
        return None
    return translate('marks_panel_card_alt_hint')


def _percent_value(state):
    if state is None or not is_number(state['percent']):
        return None
    return moe_macros(state)['percent'] + PERCENT_SUFFIX


# The percent after each of the last battles, oldest first, walked back from today's percent by the battles' changes.
def percent_history(percent, deltas):
    points = [percent]
    for delta in reversed(deltas or ()):
        points.insert(0, points[0] - delta)
    return [round(min(100.0, max(0.0, point)), 2) for point in points] if len(points) > 1 else []


def _hero(data, settings):
    state = data.state
    if state is None or not is_number(state['percent']):
        return None
    deltas = data.summary.get('deltas') if settings.get('show_trend') and data.summary else None
    return card_hero(
        state['percent'],
        shape=class_key(data.class_tag) or DEFAULT_SHAPE,
        tick=state['next_level'],
        points=percent_history(state['percent'], deltas),
    )


def tank_card(data, settings, translate):
    state = data.state
    return card(
        translate('marks_panel_title'),
        (mark_icon(state['marks']) if state is not None else None) or glyph('target'),
        _rows(data, settings, translate),
        subtitle=data.vehicle,
        value=_percent_value(state),
        value_tone='gold',
        hero=_hero(data, settings),
        chips=_chips(state, translate) if state is not None else (),
        strip=_strip(data.summary, settings),
        footer=_footer(data, settings, translate),
        width=CARD_WIDTH,
    )


def _labelled_delta(label, value):
    return u'%s %s' % (font(label, COLOR_MUTED), font(signed_percent(value), DELTA_COLORS[delta_sign(value)]))


def _trend_line(summary, translate):
    parts = [_labelled_delta(translate('marks_panel_card_last'), summary['last_delta'])]
    if summary.get('trend') is not None and summary.get('trend_battles', 0) > 1:
        battles = counted(summary['trend_battles'], 'battles', translate)
        parts.append(_labelled_delta(translate('marks_panel_card_trend', battles=battles), summary['trend']))
    return METRIC_SEPARATOR.join(parts)


def _targets_line(state, values, translate):
    template = translate('marks_panel_line_target')
    macros = [{'level': u'%d' % level, 'need': values['need%d' % level]} for level in card_levels(state)]
    return TARGET_SEPARATOR.join(render(template, level_macros) for level_macros in macros)


def _ratings_line(data, translate):
    rating = _rating_value(data.tank.get('wn8'))
    parts = [translate('marks_panel_card_ratings') + u' ' + rating] if rating is not None else []
    facts = _tank_facts(data.tank, translate)
    if facts:
        parts.append(facts)
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


def card_text(data, settings, translate):
    size = settings.get('font_size')
    if data.state is not None:
        lines = _marks_lines(data, settings, translate)
    else:
        lines = [font(data.vehicle or translate('marks_panel_title'), COLOR_NEUTRAL, size)]
    if _shows_ratings(data, settings):
        lines.append(font(_ratings_line(data, translate), COLOR_MUTED, size))
    if _shows_detail(data, settings):
        lines.extend(font(line, COLOR_MUTED, size) for line in _progress_lines(data, settings, translate) if line)
    return LINE_SEPARATOR.join(lines)


def _progress_lines(data, settings, translate):
    lines = []
    if settings.get('show_mastery'):
        lines.append(mastery_line(data.mastery, data.own_mastery, translate))
    if settings.get('show_research'):
        lines.append(research_line(data.research, translate))
    return lines
