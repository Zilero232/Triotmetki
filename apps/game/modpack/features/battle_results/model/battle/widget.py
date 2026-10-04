from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.compat import is_number
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
    return round(max(0.0, min(1.0, value)), 3)


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


# The `battle_summary` widget of a card view (view.live_view, view.last_view). `dismiss` is the panel's alias the page's
# close mark sends back as `pressed` (the previous battle's card), None for a card without one.
def card_widget(view, dismiss=None):
    return widget(WIDGET_KIND, {
        'title': _text(view['title'], 'title') or u'',
        'subtitle': _text(view['subtitle'], 'subtitle'),
        'result': _text(view['result'], 'value'),
        'result_tone': tone(view['result_tone'], 'muted'),
        'tiles': [_tile(tile) for tile in view['tiles']][:LIMITS['tiles']],
        'rows': [_row(row) for row in view['rows']][:LIMITS['rows']],
        'dismiss': dismiss,
    })
