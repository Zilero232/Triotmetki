# -*- coding: utf-8 -*-
"""User-editable panel templates with `{macro}` placeholders (the XVM hit-log idea).

Built on the standard library's `string.Template` with a `{name}` pattern instead of `$name`:
`render(u'{dealt} / {blocked}', values)`. `{{` is a literal brace. A macro the values do not know stays
in the text as written (so a typo shows up instead of raising in battle). Values are formatted with
`format_value` (numbers get the space thousands separator of the panels). `render_markup` is the same for a
template written in the panels' HTML subset: the template stays markup, each value is escaped unless it is `Markup`.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from string import Template

from ..compat import is_number, string_types, to_text
from ..format import Markup, escape, format_number
from .constants import MAX_TEMPLATE_LENGTH


class MacroTemplate(Template):
    delimiter = u'{'
    pattern = r'''
    \{(?:
      (?P<escaped>\{) |
      (?P<named>[a-z_][a-z0-9_]*)\} |
      (?P<braced>(?!)) |
      (?P<invalid>)
    )
    '''


def format_value(value):
    if value is None or value is False:
        return u''
    if value is True:
        return u'1'
    if is_number(value):
        return format_number(value)
    return to_text(value)


# Unknown macros render as written on both Pythons: 2.7's safe_substitute would drop the `}`.
class _Values(dict):

    def __missing__(self, key):
        return u'{%s}' % key


def render(template, values):
    if not isinstance(template, string_types):
        return u''
    text = to_text(template)[:MAX_TEMPLATE_LENGTH]
    formatted = _Values((key, format_value(value)) for key, value in values.items())
    return MacroTemplate(text).safe_substitute(formatted)


def render_markup(template, values):
    escaped = dict((key, escape(format_value(value))) for key, value in values.items())
    return Markup(render(template, escaped))
