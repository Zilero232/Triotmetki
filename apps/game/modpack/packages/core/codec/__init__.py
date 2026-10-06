"""JSON on the standard library's `json`: the canonical form (sorted keys, no spaces, ASCII) the signed
request bodies, the compact state files and the UI messages share, and the site's response bodies."""
from __future__ import absolute_import, division, print_function, unicode_literals

import json

from ..compat import to_bytes, to_text
from .constants import CANONICAL, MAX_NUMBER_CHARS


def canonical_json(value):
    """`value` as canonical JSON text."""
    return json.dumps(value, **CANONICAL)


def encode_json(value):
    """The canonical UTF-8 body of `value`."""
    return to_bytes(canonical_json(value))


def _bounded(convert):
    def parse(text):
        if len(text) > MAX_NUMBER_CHARS:
            raise ValueError('number of %d characters' % len(text))
        return convert(text)
    return parse


_parse_int = _bounded(int)
_parse_float = _bounded(float)


def decode_json(data):
    """`json.loads` over bytes or text; raises ValueError / UnicodeDecodeError on a bad body, and on a number longer
    than MAX_NUMBER_CHARS (Python 2 converts a long integer in quadratic time)."""
    return json.loads(to_text(data), parse_int=_parse_int, parse_float=_parse_float)


def parse_json_body(body):
    """A JSON object body as a dict, or None (empty, not JSON, not an object)."""
    if not body:
        return None
    try:
        data = decode_json(body)
    except (ValueError, UnicodeDecodeError):
        return None
    return data if isinstance(data, dict) else None


def parse_retry_after(headers):
    """Seconds from a Retry-After header (any case), or None."""
    if not isinstance(headers, dict):
        return None
    for key, value in headers.items():
        if to_text(key).lower() == 'retry-after':
            try:
                return float(to_text(value).strip())
            except (TypeError, ValueError):
                return None
    return None
