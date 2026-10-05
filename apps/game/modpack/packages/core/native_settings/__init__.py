"""Components that change the player's own standard client settings (the ones the game's settings window
offers), described as choices where 'native' keeps the game's value. Pure: the mapping from component
values to client setting names; `core/client/native` reads and writes them."""
from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import (
    ACTION_RECOMMENDED,
    ACTION_RESTORE,
    BACKUP_STATE_KEY,
    NATIVE,
    OFF,
    ON,
    RETIRED_STAMP_STATE_KEY,
    TRI_STATE,
)
from .initial import NativeState, client_keys, is_recommended, native_choices, offered_action, recommended
from .mapping import changed_values, from_table, merge_value, native_values, setting_names, tri_state
from .write import write_settings

__all__ = (
    'ACTION_RECOMMENDED',
    'ACTION_RESTORE',
    'BACKUP_STATE_KEY',
    'NATIVE',
    'OFF',
    'ON',
    'RETIRED_STAMP_STATE_KEY',
    'TRI_STATE',
    'NativeState',
    'changed_values',
    'client_keys',
    'from_table',
    'is_recommended',
    'merge_value',
    'native_choices',
    'native_values',
    'offered_action',
    'recommended',
    'setting_names',
    'tri_state',
    'write_settings',
)
