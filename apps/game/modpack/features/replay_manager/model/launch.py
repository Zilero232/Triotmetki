from __future__ import absolute_import, division, print_function, unicode_literals

import os

from ....core.compat import is_number, string_types, to_text
from ....core.replay_file import is_replay_name
from .constants import LAUNCH_TTL_S, STOP_DESTROYED_ARG, STOP_DESTROYED_INDEX


def launch_request(path, now):
    return {'path': to_text(path), 'at': float(now)}


def _is_request(data):
    if not isinstance(data, dict):
        return False
    return isinstance(data.get('path'), string_types) and is_number(data.get('at'))


def pending_launch(data, now, exists):
    if not _is_request(data):
        return None
    path = to_text(data['path'])
    if not is_replay_name(os.path.basename(path)):
        return None
    is_fresh = 0 <= now - data['at'] <= LAUNCH_TTL_S
    if not is_fresh or not exists(path):
        return None
    return path


# BattleReplay.stop(rewindToTime, delete, isDestroyed): isDestroyed means the client really quits.
def stop_on_teardown(args, kwargs):
    if STOP_DESTROYED_ARG in kwargs:
        return bool(kwargs[STOP_DESTROYED_ARG])
    return len(args) > STOP_DESTROYED_INDEX and bool(args[STOP_DESTROYED_INDEX])
