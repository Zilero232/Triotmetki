"""Python 2/3 helpers on top of the vendored `six`, and `call` for client objects whose API drifts.

The type aliases are six's; `to_text` / `to_bytes` / `to_native` are six's `ensure_*` that also take a
non-string (a number, None) by converting it to text first, which is what the mod's callers rely on.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ..vendor import six

PY2 = six.PY2
text_type = six.text_type
binary_type = six.binary_type
string_types = six.string_types
integer_types = six.integer_types


def _string(value):
    return value if isinstance(value, (six.text_type, six.binary_type)) else six.text_type(value)


def to_bytes(value, encoding='utf-8'):
    return six.ensure_binary(_string(value), encoding)


def to_text(value, encoding='utf-8'):
    return six.ensure_text(_string(value), encoding)


def to_native(value, encoding='utf-8'):
    """The interpreter's `str`: bytes on Python 2 (httplib must not mix unicode headers with a binary body)."""
    return six.ensure_str(_string(value), encoding)


def is_int(value):
    return isinstance(value, six.integer_types) and not isinstance(value, bool)


def is_number(value):
    return is_int(value) or isinstance(value, float)


def is_finite_number(value):
    """`value` is a number (never a bool) that is neither infinite nor NaN."""
    if not is_number(value):
        return False

    return not math.isinf(value) and not math.isnan(value)


def as_int(value, default=0):
    """`value` as an int when it is a number (floats truncated), else `default`."""
    return int(value) if is_number(value) else default


def clamp(value, low, high):
    """`value` held within [low, high]."""
    return max(low, min(high, value))


def fraction(value):
    """`value` held within [0.0, 1.0]."""
    return clamp(value, 0.0, 1.0)


def _within(value, low, high):
    return (low is None or value >= low) and (high is None or value <= high)


def number_or_none(value, low=None, high=None):
    """`value` unchanged when it is a number (never a bool) within [low, high], else None."""
    return value if is_number(value) and _within(value, low, high) else None


def int_or_none(value, low=None, high=None):
    """`value` unchanged when it is an int (never a bool) within [low, high], else None."""
    return value if is_int(value) and _within(value, low, high) else None


def clean_text(value, limit, default=None):
    """A string `value` as stripped text cut to `limit` characters; `default` for a non-string or a blank one."""
    if not isinstance(value, six.string_types):
        return default
    return to_text(value).strip()[:limit] or default


# The keyword-only arguments Python 2 has no syntax for.
def keyword_options(given, defaults):
    unknown = set(given) - set(defaults)
    if unknown:
        raise TypeError('unexpected options: %s' % ', '.join(sorted(unknown)))
    options = dict(defaults)
    options.update(given)
    return options


def call(target, name, default=None, *args):
    """`target.name(*args)`, or `default` when the method is missing or raises (client API drift)."""
    method = getattr(target, name, None)
    if method is None:
        return default
    try:
        return method(*args)
    except Exception:
        return default
