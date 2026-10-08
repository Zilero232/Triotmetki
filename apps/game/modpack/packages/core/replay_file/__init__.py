"""Reading the JSON header blocks of the client's own replay files (.mtreplay / .wotreplay).

Pure: file access only, no client imports. Shared by the replay upload and the replay manager.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import EXTENSIONS, MAGIC, MAX_BLOCKS, MAX_HEADER_BLOCK_BYTES, RECORDING_NAME
from .header import (
    is_replay_name,
    name_time,
    own_outcome,
    own_stats,
    parse_date_time,
    read_header,
    read_header_from,
    read_json_blocks,
    same_vehicle,
)

__all__ = (
    'EXTENSIONS',
    'MAGIC',
    'MAX_BLOCKS',
    'MAX_HEADER_BLOCK_BYTES',
    'RECORDING_NAME',
    'is_replay_name',
    'name_time',
    'own_outcome',
    'own_stats',
    'parse_date_time',
    'read_header',
    'read_header_from',
    'read_json_blocks',
    'same_vehicle',
)
