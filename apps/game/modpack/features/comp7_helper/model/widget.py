# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import glyph
from ....core.hud.widget import card, card_row
from . import division_name, threshold_value, thresholds
from .battles import recent_text, streak_text, strip
from .constants import CARD_WIDTH, STATUS_TONES


def battle_rows(history, translate):
    rows = []
    streak_line = streak_text(history, translate)
    if streak_line:
        rows.append(card_row(streak_line, icon=glyph('points'), tone_name='gold'))
    recent_line = recent_text(history, translate)
    if recent_line:
        rows.append(card_row(recent_line, icon=glyph('session'), text_tone='muted'))
    return rows


def threshold_row(step, status, translate):
    return card_row(
        division_name(step, translate),
        threshold_value(step, translate),
        status=status,
        tone_name=STATUS_TONES[status],
        text_tone='muted' if status == 'idle' else 'text',
    )


def hangar_widget(state, settings, translate):
    if state is None:
        return None
    rows = []
    if settings.get('show_thresholds'):
        rows.extend(threshold_row(step, status, translate) for step, status in thresholds(state))
    if settings.get('show_skill') and state['skill']:
        rows.append(card_row(state['skill'], icon=glyph('module'), label=translate('comp7_helper_skill')))
    history = (state.get('battles') or []) if settings.get('show_battles') else []
    rows.extend(battle_rows(history, translate))
    if not rows:
        return None
    return card(
        translate('comp7_helper_card_title'),
        glyph('record'),
        rows,
        footer=translate('comp7_helper_footer'),
        strip=strip(history),
        width=CARD_WIDTH,
    )
