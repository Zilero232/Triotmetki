"""Structured panel payloads for the Gameface HUD page (protocol v3).

A panel is `{id, text, widget, ...}`: `text` stays the GUIFlash HTML, `widget` (`{kind, v, data}`, or None) is what the
Gameface page draws with its own component for `kind`. The page falls back to `text` when it does not know the kind or
the data fails its schema (`ui-web/src/entities/hud/<kind>`). Icon fields are strings from `core.hud.icons`.

`card(...)` is the shared plate of the hangar labels and the smaller battle panels (kind `card`,
`ui-web/src/entities/hud/card`): a caps header with an icon, an optional big value, rows of icon + text + value
with an optional one-line detail and a progress bar, a strip of icon + number chips, a strip of colour marks and a
dimmed footer; `card_hero(...)` adds a tank silhouette filled to a percent, a threshold scale and a sparkline.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import is_number, keyword_options, string_types, to_text
from .constants import (
    CARD_KIND,
    CARD_LIMITS,
    CARD_OPTIONS,
    HERO_OPTIONS,
    HEX_COLOR,
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
    'card_hero',
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


def _is_plain_number(value):
    return is_number(value) and not isinstance(value, bool)


def _text(value, limit):
    if _is_plain_number(value):
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
    if not _is_plain_number(value):
        return None
    return round(max(0.0, min(1.0, float(value))), 3)


def _color(value):
    if isinstance(value, string_types) and HEX_COLOR.match(value):
        return to_text(value).upper()
    return None


def color_override(value, default):
    """`value` (`#RRGGBB`, upper-cased) when the player set a colour other than `default`, else None: the page then
    paints the tone the payload names."""
    color = _color(value)
    if color is None or color == _color(default):
        return None
    return color


def _width(value):
    if not _is_plain_number(value):
        return None
    low, high = CARD_LIMITS['width']
    return int(max(low, min(high, value)))


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
        'color': _color(style['color']),
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
        'color': _color(color),
    }


def _fill(value):
    if not _is_plain_number(value):
        return None
    return round(max(0.0, min(100.0, float(value))), 2)


def _points(values):
    points = [round(float(value), 2) for value in values or () if _is_plain_number(value)]
    return points[-CARD_LIMITS['points']:]


def card_hero(fill, **style):
    """The hero block of a card: the silhouette `shape` (a vehicle class key: light, medium, heavy, td, spg) filled from
    the left to `fill` percent (0..100) in `tone_name`, a `tick` (the next level, a percent on the same axis) and a
    sparkline of `points` (oldest first)."""
    style = keyword_options(style, HERO_OPTIONS)
    return {
        'fill': _fill(fill),
        'tone': tone(style['tone_name'], 'gold'),
        'shape': _text(style['shape'], CARD_LIMITS['value']),
        'tick': _fill(style['tick']),
        'points': _points(style['points']),
    }


def _strip(marks):
    tones = [tone(mark, 'muted') for mark in marks]
    return tones[-CARD_LIMITS['strip']:]


def card(title=None, icon=None, rows=(), **layout):
    """The `card` widget: `title` in caps with `icon`, then `rows`.

    `layout` takes `subtitle` (next to the title), `value` big on the right with its `value_tone`, `chips`, `strip` (a
    row of small marks, one tone each, e.g. the last battles' results; the newest kept), `footer` and `width` (design
    px, fixes the plate's width) and `hero` (`card_hero`). A battle panel leaves `title` out: battle plates carry no
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
        'hero': layout['hero'] if isinstance(layout['hero'], dict) else None,
    })
