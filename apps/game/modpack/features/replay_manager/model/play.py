from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import to_native, to_text
from .constants import ERROR_BATTLE, ERROR_MISSING, ERROR_PLAYING, ERROR_UNAVAILABLE, ERROR_VERSION
from .version import compatible


def play_refusal(replay, client_version, in_battle, playing, available):
    if not available:
        return ERROR_UNAVAILABLE
    if in_battle:
        return ERROR_BATTLE
    if playing:
        return ERROR_PLAYING
    if replay is None:
        return ERROR_MISSING
    header = replay.get('header') or {}
    if not compatible(header.get('client_version'), client_version):
        return ERROR_VERSION
    return None


# The path as the client's own `str` in the file system encoding (the client opens the replay with it), or None when
# that encoding cannot hold it. Python 2's mbcs swaps what it cannot hold for '?', so the encoded path must decode back.
def native_path(path, encoding):
    text = to_text(path)
    try:
        encoded = text.encode(encoding)
        if encoded.decode(encoding) != text:
            return None
    except (LookupError, UnicodeError):
        return None
    return to_native(encoded, encoding)
