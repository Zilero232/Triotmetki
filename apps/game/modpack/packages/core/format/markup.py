from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import string_types, text_type, to_text
from .constants import FONT_COLOR, MARKUP_ESCAPES, SPACES, TAGS


class Markup(text_type):
    """Text already in the GUIFlash HTML subset: `font` and `escape` keep it as it is.

    Only for markup the mod builds itself (`font` output, `<img>` tags, the player's own templates);
    joining or formatting it gives plain text again, so a composed line is wrapped once more.
    """

    __slots__ = ()


def escape(text):
    """`text` as markup that shows it literally (`<`, `>`, `&` as entities); `Markup` passes through."""
    if isinstance(text, Markup):
        return text
    escaped = to_text(text)
    for raw, entity in MARKUP_ESCAPES:
        escaped = escaped.replace(raw, entity)
    return Markup(escaped)


def font_color(color):
    """`color` if it is a `#RRGGBB` / `#AARRGGBB` hex, else None (the tag then has no colour)."""
    if isinstance(color, string_types) and FONT_COLOR.match(color):
        return to_text(color)
    return None


def font(text, color, size=None):
    """`text` in a GUIFlash `<font>` tag (the HTML subset the panels render), escaped unless `Markup`."""
    attributes = u''
    valid_color = font_color(color)
    if valid_color:
        attributes += u' color="%s"' % valid_color
    if size:
        attributes += u' size="%d"' % size
    return Markup(u'<font%s>%s</font>' % (attributes, escape(text)))


def strip_tags(text, replacement=''):
    """`text` without the markup tags, each replaced by `replacement`."""
    return TAGS.sub(replacement, to_text(text))


def single_spaces(text):
    """`text` with every run of whitespace turned into one space, trimmed."""
    return SPACES.sub(' ', to_text(text)).strip()
