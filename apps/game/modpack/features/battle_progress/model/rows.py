from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import format_number
from .constants import ESTIMATE, MAIN_GUN_LOOKS, PAST_THRESHOLD, REACHED, ROWS, STILL_NEEDED
from .wn8 import rating_color

# One row per target, as plain data both renderers read: the card row of the Gameface page (model/widget.py) and the
# GUIFlash line (model/text.py).


def _row(kind, text, value, **style):
    row = {
        'kind': kind,
        'text': text,
        'value': value,
        'tone': 'text',
        'color': None,
        'note': None,
        'detail': None,
        'progress': None,
        'progress_tone': 'gold',
    }
    row.update(style)
    return row


def _share(state, translate):
    return translate('bp_share', share=state['share'], team=format_number(state['team']))


def _main_gun_value(main_gun):
    damage, need = main_gun['damage'], main_gun['need']
    if damage >= need:
        return PAST_THRESHOLD % format_number(damage - need)
    return STILL_NEEDED % format_number(need - damage)


def main_gun_row(state, settings, translate, view):
    main_gun = state['main_gun']
    if main_gun is None:
        return None
    look = MAIN_GUN_LOOKS[main_gun['status']]
    detail = _share(main_gun, translate) if settings.get('main_gun_share') or view['extended'] else None
    text = translate('bp_main_gun')
    if look['word'] is not None:
        return _row('main_gun', text, translate(look['word']), tone=look['tone'], detail=detail)

    settled = main_gun['status'] == REACHED and view['settled']
    return _row(
        'main_gun',
        text,
        _main_gun_value(main_gun),
        tone=look['tone'],
        detail=detail,
        progress=None if settled else min(1.0, float(main_gun['damage']) / main_gun['need']),
        progress_tone=look['bar'],
    )


def wn8_row(state, settings, translate, view):
    wn8 = state['wn8']
    if wn8 is None:
        return None
    tank_wn8 = wn8['tank_wn8']
    return _row(
        'wn8',
        translate('bp_wn8'),
        ESTIMATE % format_number(wn8['wn8']),
        color=rating_color(wn8['wn8']) if settings.get('colored') else None,
        note=translate('bp_tank_wn8', wn8=format_number(tank_wn8)) if tank_wn8 is not None else None,
    )


ROW_BUILDERS = {'main_gun': main_gun_row, 'wn8': wn8_row}


def progress_rows(state, settings, translate, extended=False):
    view = {'extended': extended, 'settled': state['settled']}
    rows = []
    for kind in ROWS:
        if settings.get('row_' + kind):
            rows.append(ROW_BUILDERS[kind](state, settings, translate, view))
    return [row for row in rows if row is not None]
