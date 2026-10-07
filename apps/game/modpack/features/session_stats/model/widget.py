# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.format import counted, format_number, format_percent
from ....core.hud.icons import glyph
from ....core.hud.widget import card, card_chip, card_row
from ....core.own_result import RESULT_TONES
from .constants import CARD_WIDTH, DONE_MARK
from .goals import is_done, progress
from .labels import account_facts, account_wn8, goal_label, goal_value, pending_caption
from .moe import change_tone, signed_change
from .ratings import tier_color, win_rate_tone, wn8_tier


def session_chips(summary, translate):
    win_rate = summary.get('win_rate')
    chips = [
        card_chip(format_percent(win_rate), None, win_rate_tone(win_rate), translate('session_winrate')),
        card_chip(format_number(summary.get('avg_damage')), None, 'text', translate('session_damage')),
    ]

    wn8 = summary.get('wn8')
    if is_number(wn8):
        chips.append(card_chip(format_number(wn8), None, 'text', translate('session_wn8'), tier_color(wn8_tier(wn8))))

    return chips


def goal_row(goal, translate, vehicle_name):
    label = goal_label(goal, translate, vehicle_name)
    if is_done(goal):
        return card_row(label, DONE_MARK, tone_name='good')
    current = goal_value(goal['metric'], goal.get('current'))
    return card_row(label, current, progress=progress(goal), progress_tone='gold')


def moe_row(entry, translate, vehicle_name):
    note = format_percent(entry['percent']) if is_number(entry['percent']) else None
    change = entry['change']
    label = translate('session_moe')
    return card_row(vehicle_name, signed_change(change), label=label, note=note, tone_name=change_tone(change))


def account_row(overview, settings, translate):
    overall = overview.get('overall')
    if overall is None:
        return card_row(translate('session_account_no_data'), text_tone='muted')

    wn8 = account_wn8(overall, settings)
    facts = account_facts(overall, settings, translate)
    if wn8 is None and facts is None:
        return None
    return card_row(
        facts,
        wn8,
        label=translate('session_account'),
        text_tone='muted',
        color=tier_color(overall['wn8']['tier']),
    )


def session_widget(view, settings, translate):
    summary = view.summary
    battles = summary.get('battles') or 0
    rows = [moe_row(entry, translate, view.vehicle_names.get(entry['tank_id'])) for entry in view.moe]
    rows.extend(goal_row(goal, translate, view.vehicle_names.get(goal.get('tank_id'))) for goal in view.goals)
    if view.overview is not None:
        rows.append(account_row(view.overview, settings, translate))

    return card(
        translate('session_title'),
        glyph('session'),
        rows,
        subtitle=pending_caption(summary.get('pending'), translate),
        value=counted(battles, 'battles', translate),
        chips=session_chips(summary, translate) if battles else (),
        strip=[RESULT_TONES[result] for result in summary.get('recent') or ()],
        width=CARD_WIDTH,
    )
