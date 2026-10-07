from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import string_types, to_text
from .constants import VERSION_PARTS, VERSION_SPLIT


def version_key(text):
    if not isinstance(text, string_types):
        return None
    parts = [part for part in VERSION_SPLIT.split(to_text(text)) if part]
    if len(parts) < VERSION_PARTS:
        return None
    return tuple(int(part) for part in parts[:VERSION_PARTS])


def compatible(replay_version, client_version):
    replay_key = version_key(replay_version)
    return replay_key is not None and replay_key == version_key(client_version)
