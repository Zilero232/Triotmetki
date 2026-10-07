from __future__ import absolute_import, division, print_function, unicode_literals

import os

from ....core.compat import string_types, to_text
from ....core.format import single_spaces
from .constants import ERROR_NAME, FORBIDDEN_CHARS, NAME_MAX_CHARS, RESERVED_NAMES
from .errors import ReplayActionError


def rename_target(old_name, title):
    if not isinstance(title, string_types):
        raise ReplayActionError(ERROR_NAME)
    extension = os.path.splitext(to_text(old_name))[1]
    spaced = FORBIDDEN_CHARS.sub(' ', to_text(title))
    stem = single_spaces(spaced).strip('.')
    if stem.lower().endswith(extension.lower()):
        stem = stem[:-len(extension)].strip()
    stem = stem[:NAME_MAX_CHARS].strip()
    if not stem or stem.lower() in RESERVED_NAMES:
        raise ReplayActionError(ERROR_NAME)
    return stem + extension


def is_taken(source, target, exists=os.path.exists, normcase=os.path.normcase):
    return exists(target) and normcase(target) != normcase(source)
