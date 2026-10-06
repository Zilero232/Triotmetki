from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import string_types
from .constants import FAILURE_KEY, FAILURE_KEYS


def failure_key(reason):
    if not isinstance(reason, string_types):
        return FAILURE_KEY
    return FAILURE_KEYS.get(reason, FAILURE_KEY)
