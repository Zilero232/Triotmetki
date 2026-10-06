"""Structured panel payloads for the Gameface HUD page (protocol v3).

A panel is `{id, text, widget, ...}`: `text` stays the panels' HTML subset, `widget` (`{kind, v, data}`, or None) is
what the Gameface page draws with its own component for `kind`. The page falls back to `text` when it does not know the
kind or the data fails its schema (`ui-web/src/entities/hud/<kind>`). Icon fields are strings from `core.hud.icons`.

`card(...)` is the shared plate of the hangar labels and the smaller battle panels (kind `card`,
`ui-web/src/entities/hud/card`): a caps header with an icon, an optional big value, rows of icon + text + value
with an optional one-line detail and a progress bar, a strip of icon + number chips, a strip of colour marks and a
dimmed footer.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import clamp, fraction, is_number, keyword_options, string_types, to_text
from ..panel import hex_color
from .constants import (
    CARD_KIND,
    CARD_LIMITS,
    CARD_OPTIONS,
    ROW_OPTIONS,
    STATUSES,
    TONES,
    WIDGET_VERSION,
)

__all__ = (
    'CARD_KIND',
    'STATUSES',
    'TONES',
    'WIDGET_VERSION',
    'card',
    'card_chip',
    'card_row',
    'color_override',
    'tone',
    'widget',
)


def widget(kind, data):
    return {'kind': kind, 'v': WIDGET_VERSION, 'data': data}


def tone(value, default='text'):
    """`value` when it is a known colour role, else `default`."""
    return value if value in TONES else default


def _text(value, limit):
    if is_number(value):
        value = to_text(value)
    if not isinstance(value, string_types):
        return None
    text = to_text(value).strip()
    return text[:limit] or None


def _icon(value):
    if isinstance(value, string_types) and value:
        return to_text(value)
    return None


def _progress(value):
    if not is_number(value):
        return None
    return round(fraction(float(value)), 3)


def color_override(value, default):
    """`value` (`#RRGGBB`, upper-cased) when the player set a colour other than `default`, else None: the page then
    paints the tone the payload names."""
    color = hex_color(value)
    if color is None or color == hex_color(default):
        return None
    return color


def _width(value):
    if not is_number(value):
        return None
    low, high = CARD_LIMITS['width']
    return int(clamp(value, low, high))


def card_row(text=None, value=None, **style):
    """One row: `[icon|status] label text ....... value note`, then `detail` (one dimmed line) and a thin progress bar.

    `style` takes `icon`, `status` (STATUSES), `label`, `note`, `detail`, `progress` (0..1), the tones `tone_name`
    (the value), `text_tone` and `progress_tone`, and `color` (`#RRGGBB`, a rating scale colour) that paints the value
    instead of its tone."""
    style = keyword_options(style, ROW_OPTIONS)
    return {
        'icon': _icon(style['icon']),
        'status': style['status'] if style['status'] in STATUSES else None,
        'label': _text(style['label'], CARD_LIMITS['text']),
        'text': _text(text, CARD_LIMITS['text']),
        'text_tone': tone(style['text_tone']),
        'value': _text(value, CARD_LIMITS['value']),
        'tone': tone(style['tone_name']),
        'color': hex_color(style['color']),
        'note': _text(style['note'], CARD_LIMITS['value']),
        'detail': _text(style['detail'], CARD_LIMITS['detail']),
        'progress': _progress(style['progress']),
        'progress_tone': tone(style['progress_tone'], 'accent'),
    }


def card_chip(value, icon=None, tone_name='text', label=None, color=None):
    """An icon + number in the chips strip (`label` is a dimmed caption before the number, `color` as in `card_row`)."""
    return {
        'icon': _icon(icon),
        'value': _text(value, CARD_LIMITS['value']) or u'',
        'tone': tone(tone_name),
        'label': _text(label, CARD_LIMITS['value']),
        'color': hex_color(color),
    }


def _strip(marks):
    tones = [tone(mark, 'muted') for mark in marks]
    return tones[-CARD_LIMITS['strip']:]


def card(title=None, icon=None, rows=(), **layout):
    """The `card` widget: `title` in caps with `icon`, then `rows`.

    `layout` takes `subtitle` (next to the title), `value` big on the right with its `value_tone`, `chips`, `strip` (a
    row of small marks, one tone each, e.g. the last battles' results; the newest kept), `footer` and `width` (design
    px, fixes the plate's width). A battle panel leaves `title` out: battle plates carry no
    caps titles."""
    layout = keyword_options(layout, CARD_OPTIONS)
    return widget(CARD_KIND, {
        'title': _text(title, CARD_LIMITS['title']),
        'icon': _icon(icon),
        'subtitle': _text(layout['subtitle'], CARD_LIMITS['title']),
        'value': _text(layout['value'], CARD_LIMITS['value']),
        'value_tone': tone(layout['value_tone']),
        'chips': [chip for chip in layout['chips'] if chip][:CARD_LIMITS['chips']],
        'strip': _strip(layout['strip']),
        'rows': [row for row in rows if row][:CARD_LIMITS['rows']],
        'footer': _text(layout['footer'], CARD_LIMITS['detail']),
        'width': _width(layout['width']),
    })
