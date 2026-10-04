from __future__ import absolute_import, division, print_function, unicode_literals

from .....core.format import COLOR_MUTED, COLOR_NEUTRAL, font
from .constants import SUBTITLE_SEPARATOR, TILE_SEPARATOR, TONE_COLORS


def _color(tone_name):
    return TONE_COLORS.get(tone_name, COLOR_NEUTRAL)


def _head(view, size):
    head = font(view['title'], COLOR_NEUTRAL, size)
    if view['result']:
        head += SUBTITLE_SEPARATOR + font(view['result'], _color(view['result_tone']), size)
    return head


def _tile(tile, size):
    return u'%s %s' % (font(tile['label'], COLOR_MUTED, size), font(tile['value'], COLOR_NEUTRAL, size))


def _row_line(row, size):
    value = u' '.join(part for part in (row['value'], row['note']) if part)
    return u'%s %s' % (font(row['text'], COLOR_MUTED, size), font(value, _color(row['tone']), size))


# The GUIFlash lines of a card view: the title and result, the vehicle and map, the tiles on one line, a line per row.
def card_text(view, size):
    lines = [_head(view, size)]
    if view['subtitle']:
        lines.append(font(view['subtitle'], COLOR_MUTED, size))
    if view['tiles']:
        lines.append(TILE_SEPARATOR.join(_tile(tile, size) for tile in view['tiles']))
    lines.extend(_row_line(row, size) for row in view['rows'])
    return u'\n'.join(lines)
