# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import int_or_none
from ....core.format import count_phrase, format_signed
from ....core.hud.modes import MODE_COMP7, battle_mode
from ....core.own_result import own_result
from .constants import KEPT_BATTLES, MIN_STREAK, RESULT_TONES, SHOWN_BATTLES

# Fair play: only the player's own Onslaught battles, from the own battle results the client already shows (the
# `personal` block: the own vehicle's team and the rating change of the post-battle screen). Nothing about other
# players is read or kept.


def own_battle(arena_id, results):
    """The own Onslaught battle of `results` ({arena, result, delta, t}), or None for another battle type."""
    if not isinstance(results, dict) or int_or_none(arena_id) is None:
        return None
    common = results.get('common') or {}
    if battle_mode(common.get('guiType'), common.get('bonusType')) != MODE_COMP7:
        return None
    result = own_result(results)
    if result is None:
        return None
    avatar = (results.get('personal') or {}).get('avatar') or {}
    return {
        'arena': arena_id,
        'result': result,
        'delta': int_or_none(avatar.get('comp7RatingDelta')),
        't': int_or_none(common.get('arenaCreateTime')) or 0,
    }


def clean_history(raw):
    if not isinstance(raw, list):
        return []
    kept = [entry for entry in raw if isinstance(entry, dict) and entry.get('result') in RESULT_TONES]
    return kept[-KEPT_BATTLES:]


def record(history, battle):
    if battle is None or any(entry.get('arena') == battle['arena'] for entry in history):
        return history
    return (history + [battle])[-KEPT_BATTLES:]


def streak(history):
    """(result, length) of the run of equal results the newest battle ends; a draw ends every run."""
    if not history or history[-1]['result'] == 'draw':
        return None, 0
    result = history[-1]['result']
    length = 0
    for entry in reversed(history):
        if entry['result'] != result:
            break
        length += 1
    return result, length


def recent(history):
    return history[-SHOWN_BATTLES:]


def recent_delta(history):
    deltas = [entry['delta'] for entry in recent(history) if entry.get('delta') is not None]
    return sum(deltas) if deltas else None


def streak_text(history, translate):
    result, length = streak(history)
    if length < MIN_STREAK:
        return None
    battles = count_phrase(length, translate('comp7_helper_forms_%s' % result))
    return translate('comp7_helper_streak', count=battles)


def recent_text(history, translate):
    shown = recent(history)
    if not shown:
        return None
    marks = u''.join(translate('comp7_helper_mark_%s' % entry['result']) for entry in shown)
    delta = recent_delta(history)
    if delta is None:
        return translate('comp7_helper_recent', marks=marks)
    return translate('comp7_helper_recent_delta', marks=marks, delta=format_signed(delta))


def battle_lines(history, translate):
    return [line for line in (streak_text(history, translate), recent_text(history, translate)) if line]


def strip(history):
    return [RESULT_TONES[entry['result']] for entry in recent(history)]
