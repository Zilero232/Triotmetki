from __future__ import absolute_import, division, print_function, unicode_literals

import base64
import binascii
import zlib

from ...core.codec import canonical_json, decode_json
from ...core.compat import string_types, to_bytes, to_text
from .constants import CODE_MAX_CHARS, CODE_PREFIX, ERROR_CODE, UNPACKED_MAX_BYTES
from .errors import ProfileError


def encode_profile(name, snapshot):
    raw = canonical_json({'name': name, 'data': snapshot})
    packed = base64.urlsafe_b64encode(zlib.compress(to_bytes(raw), 9))
    return CODE_PREFIX + to_text(packed).rstrip('=')


def decode_profile(code):
    if not isinstance(code, string_types):
        raise ProfileError(ERROR_CODE)
    code = to_text(code).strip()
    if not code.startswith(CODE_PREFIX) or len(code) > CODE_MAX_CHARS:
        raise ProfileError(ERROR_CODE)
    body = code[len(CODE_PREFIX):]
    body += '=' * (-len(body) % 4)
    try:
        packed = base64.urlsafe_b64decode(to_bytes(body))
        payload = decode_json(_unpacked(packed))
    # RuntimeError: a code nested too deep for the parser (RecursionError on Python 3).
    except (TypeError, ValueError, RuntimeError, binascii.Error, zlib.error, UnicodeDecodeError):
        raise ProfileError(ERROR_CODE)
    data = payload.get('data') if isinstance(payload, dict) else None
    if not _is_snapshot(data):
        raise ProfileError(ERROR_CODE)

    name = payload.get('name')
    snapshot = {'config': data.get('config') or {}, 'components': data.get('components') or {}}
    return (to_text(name) if isinstance(name, string_types) else ''), snapshot


def _unpacked(packed):
    unpacker = zlib.decompressobj()
    raw = unpacker.decompress(packed, UNPACKED_MAX_BYTES)
    if unpacker.unconsumed_tail:
        raise ProfileError(ERROR_CODE)
    return raw


def _is_snapshot(data):
    if not isinstance(data, dict):
        return False
    return isinstance(data.get('config', {}), dict) and isinstance(data.get('components', {}), dict)
