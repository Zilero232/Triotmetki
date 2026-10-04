from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.compat import is_number
from .....core.format import format_number
from .....core.moe import is_rating, moe_state, rating_to_percent
from ..text import percent_text, result_label, signed
from .constants import (
    BEATEN_BY,
    DRAW_TEAM,
    LAST_TILES,
    LIVE_TILES,
    MAIN_GUN_LOOKS,
    OF_TARGET,
    RECORD_METRIC,
    RESULT_TONES,
    SUBTITLE_SEPARATOR,
)

# What both battle cards show, as plain data both renderers read: the Gameface widget (widget.py) and the GUIFlash
# text (text.py). Fair play: the own numbers of the own battle and of the own battle results only.


def _row(kind, text, value, **style):
    row = {'kind': kind, 'text': text, 'value': value, 'note': None, 'tone': 'text', 'progress': None, 'bar': 'gold'}
    row.update(style)
    return row


def delta_tone(value):
    if not is_number(value) or value == 0:
        return 'muted'
    return 'good' if value > 0 else 'bad'


def _tiles(stats, tiles, translate):
    return [
        {'glyph': glyph, 'label': translate(label), 'value': format_number(stats.get(key)), 'tone': tone}
        for key, glyph, label, tone in tiles
        if is_number(stats.get(key))
    ]


def _subtitle(vehicle, map_name):
    return SUBTITLE_SEPARATOR.join(part for part in (vehicle, map_name) if part) or None


def _result(result, translate):
    if result not in RESULT_TONES:
        return None, 'muted'
    return result_label(result, translate), RESULT_TONES[result]


def live_moe(snapshot, combined, curve=None, pace=None):
    if not isinstance(snapshot, dict) or not is_number(snapshot.get('moving_avg_damage')):
        return None
    rating = snapshot.get('damage_rating')
    percent = rating_to_percent(rating) if is_rating(rating) else None
    return moe_state(snapshot['moving_avg_damage'], percent, combined, curve, pace, marks=snapshot.get('marks_on_gun'))


def moe_row(moe, translate):
    if moe is None:
        return None
    if moe['projected'] is not None:
        delta = moe['delta']
        text = translate('br_row_moe')
        return _row('marks', text, percent_text(moe['projected']), note=signed(delta, True), tone=delta_tone(delta))
    change = moe['ema_projected'] - moe['ema']
    text = translate('br_row_moving_avg')
    return _row('marks', text, format_number(moe['ema_projected']), note=signed(change), tone=delta_tone(change))


def main_gun_row(main_gun, translate):
    if not isinstance(main_gun, dict) or main_gun.get('status') not in MAIN_GUN_LOOKS:
        return None
    look = MAIN_GUN_LOOKS[main_gun['status']]
    text = translate('br_row_main_gun')
    if look['word'] is not None:
        return _row('main_gun', text, translate(look['word']), tone=look['tone'])

    damage, need = main_gun.get('damage') or 0, main_gun.get('need') or 0
    progress = min(1.0, float(damage) / need) if look['bar'] and need > 0 else None
    return _row(
        'main_gun',
        text,
        format_number(damage),
        note=OF_TARGET % format_number(need),
        tone=look['tone'],
        progress=progress,
        bar=look['bar'] or 'gold',
    )


def record_row(record, current, translate):
    best = (record or {}).get(RECORD_METRIC)
    if not is_number(best) or best <= 0:
        return None
    text = translate('br_row_record')
    if current > best:
        note = BEATEN_BY % format_number(current - best)
        return _row('record', text, format_number(current), note=note, tone='good', progress=1.0, bar='good')
    note = OF_TARGET % format_number(best)
    return _row('record', text, format_number(current), note=note, progress=float(current) / best)


def _rows(*rows):
    return [row for row in rows if row is not None]


# `battle`: the own `stats` so far (LiveTotals.stats), the `moe` state (live_moe), battle_progress's last state as
# `progress` (or None), the `vehicle` and `map` names and the `result` once the battle ended.
def live_view(battle, translate):
    stats = battle['stats']
    progress = battle.get('progress') or {}
    result, result_tone = _result(battle.get('result'), translate)
    return {
        'title': translate('br_live_title'),
        'subtitle': _subtitle(battle.get('vehicle'), battle.get('map')),
        'result': result,
        'result_tone': result_tone,
        'tiles': _tiles(stats, LIVE_TILES, translate),
        'rows': _rows(
            moe_row(battle.get('moe'), translate),
            main_gun_row(progress.get('main_gun'), translate),
            record_row(progress.get('record'), stats['damage'], translate),
        ),
    }


def last_moe_row(summary, translate):
    percent = summary.get('moe_percent')
    if percent is None:
        return None
    delta = summary.get('moe_delta')
    note = signed(delta, True) if delta is not None else None
    return _row('marks', translate('br_row_moe'), percent_text(percent), note=note, tone=delta_tone(delta))


# The previous battle's card from its summary (model.build_summary): map, tank, the result, damage, XP, credits after
# costs and the MoE change.
def last_view(summary, translate):
    result, result_tone = _result(summary.get('result'), translate)
    return {
        'title': translate('br_last_title'),
        'subtitle': _subtitle(summary.get('vehicle'), summary.get('map')),
        'result': result,
        'result_tone': result_tone,
        'tiles': _tiles(summary, LAST_TILES, translate),
        'rows': _rows(last_moe_row(summary, translate)),
    }


def battle_outcome(period_info, own_team):
    if not isinstance(period_info, (tuple, list)) or not period_info or own_team is None:
        return None
    winner = period_info[0]
    if winner == DRAW_TEAM:
        return 'draw'
    return 'win' if winner == own_team else 'loss'
