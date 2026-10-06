from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.compat import fraction, is_number
from .....core.hud.icons import glyph
from .....core.hud.widget import tone, widget
from .constants import LIMITS, ROW_GLYPHS, WIDGET_KIND


def _text(value, limit):
    return value[:LIMITS[limit]] if value else None


def _tile(tile):
    return {
        'icon': glyph(tile['glyph']) if tile['glyph'] else None,
        'label': _text(tile['label'], 'label') or u'',
        'value': _text(tile['value'], 'value') or u'',
        'tone': tone(tile['tone']),
    }


def _progress(value):
    if not is_number(value):
        return None
    return round(fraction(value), 3)


def _row(row):
    return {
        'icon': glyph(ROW_GLYPHS[row['kind']]),
        'text': _text(row['text'], 'label') or u'',
        'value': _text(row['value'], 'value') or u'',
        'note': _text(row['note'], 'value'),
        'tone': tone(row['tone']),
        'progress': _progress(row['progress']),
        'progress_tone': tone(row['bar'], 'gold'),
    }


def card_widget(view, show_s):
    return widget(WIDGET_KIND, {
        'card': _text(view['card'], 'card') or u'',
        'title': _text(view['title'], 'title') or u'',
        'subtitle': _text(view['subtitle'], 'subtitle'),
        'result': _text(view['result'], 'value'),
        'result_tone': tone(view['result_tone'], 'muted'),
        'tiles': [_tile(tile) for tile in view['tiles']][:LIMITS['tiles']],
        'rows': [_row(row) for row in view['rows']][:LIMITS['rows']],
        'show_s': show_s,
    })
