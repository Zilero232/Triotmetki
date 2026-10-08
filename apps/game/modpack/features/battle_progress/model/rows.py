from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import format_number
from .constants import ESTIMATE, HIDDEN_STATUSES, MAIN_GUN_LOOKS, REACHED, ROWS
from .wn8 import rating_color


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


def _progress(main_gun, view):
    is_settled = main_gun['status'] == REACHED and view['settled']
    if is_settled:
        return None
    return min(1.0, float(main_gun['damage']) / main_gun['need'])


# Battle Observer's main gun shows the damage left to the medal (MainGunUI.as as_gunData).
def main_gun_row(state, settings, translate, view):
    main_gun = state['main_gun']
    if main_gun is None or main_gun['status'] in HIDDEN_STATUSES:
        return None

    look = MAIN_GUN_LOOKS[main_gun['status']]
    left = format_number(main_gun['need'] - main_gun['damage'])
    detail = _share(main_gun, translate) if settings.get('main_gun_share') else None

    return _row(
        'main_gun',
        translate('bp_main_gun'),
        translate(look['value'], damage=left),
        tone=look['tone'],
        detail=detail,
        progress=_progress(main_gun, view),
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


def progress_rows(state, settings, translate):
    view = {'settled': state['settled']}
    rows = []
    for kind in ROWS:
        if settings.get('row_' + kind):
            rows.append(ROW_BUILDERS[kind](state, settings, translate, view))
    return [row for row in rows if row is not None]
