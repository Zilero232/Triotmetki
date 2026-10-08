"""Where the client records replays and whether it keeps every battle, shared by the replay upload and the replay
manager."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ..native import read_settings
from .constants import DEFAULT_REPLAY_DIR, RECORDS_ALL, REPLAY_SETTING

__all__ = ('DEFAULT_REPLAY_DIR', 'records_all_battles', 'replay_dir')


def replay_dir():
    return DEFAULT_REPLAY_DIR


def _mode(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def records_all_battles():
    """True when the player's replay setting keeps every battle (replayEnabled 2), False for off or the last battle
    only, None while the client's settings are unknown."""
    values = read_settings((REPLAY_SETTING,))
    if values is None or values.get(REPLAY_SETTING) is None:
        return None

    return _mode(values[REPLAY_SETTING]) == RECORDS_ALL
