# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import is_number, to_text
from .constants import FORMS, PLURAL_SEPARATOR
from .number import format_number


def plural_index(count, forms):
    number = abs(int(count)) if is_number(count) else 0
    if forms == 2:
        return 0 if number == 1 else 1
    last = number % 10
    tens = number % 100
    if last == 1 and tens != 11:
        return 0
    if 2 <= last <= 4 and not 12 <= tens <= 14:
        return 1
    return 2


def plural(count, forms):
    words = to_text(forms).split(PLURAL_SEPARATOR)
    if len(words) < 2:
        return words[0]
    return words[min(plural_index(count, len(words)), len(words) - 1)]


def count_phrase(count, forms):
    return u'%s %s' % (format_number(count), plural(count, forms))


def forms_of(words, translate):
    language = getattr(translate, 'language', None)
    return words.get(language) or words.get('ru') or u''


def counted(count, key, translate):
    """`count_phrase` with the FORMS entry `key` in the translator's language: `counted(2, 'battles', t)` -> `2 боя`."""
    return count_phrase(count, forms_of(FORMS[key], translate))
