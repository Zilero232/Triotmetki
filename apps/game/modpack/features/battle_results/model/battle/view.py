from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.compat import is_number
from .....core.format import format_number
from ..text import percent_text, result_label, signed
from .constants import LAST_TILES, RESULT_TONES, SUBTITLE_SEPARATOR

# What the previous battle's card shows, as plain data both renderers read: the Gameface widget (widget.py) and the
# GUIFlash text (text.py). Fair play: the own numbers of the own battle results only.


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


def last_moe_row(summary, translate):
    percent = summary.get('moe_percent')
    if percent is None:
        return None
    delta = summary.get('moe_delta')
    note = signed(delta, True) if delta is not None else None
    return _row('marks', translate('br_row_moe'), percent_text(percent), note=note, tone=delta_tone(delta))


# The previous battle's card from its summary (model.build_summary): map, tank, the result, damage, XP, credits after
# costs and the MoE change; `card` tells one card from the next (the page restarts its entrance for a new one).
def last_view(summary, translate):
    result, result_tone = _result(summary.get('result'), translate)
    moe = last_moe_row(summary, translate)
    return {
        'card': u'%s' % (summary.get('arena') or u''),
        'title': translate('br_last_title'),
        'subtitle': _subtitle(summary.get('vehicle'), summary.get('map')),
        'result': result,
        'result_tone': result_tone,
        'tiles': _tiles(summary, LAST_TILES, translate),
        'rows': [moe] if moe is not None else [],
    }
