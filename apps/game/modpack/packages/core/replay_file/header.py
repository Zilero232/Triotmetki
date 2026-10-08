from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import struct
import time

from ..codec import decode_json
from ..compat import is_int, string_types, to_text
from .constants import (
    ALIVE_DEATH_REASON,
    ASSIST_KEYS,
    AVATAR_KEY,
    COMMON_STATS,
    DATE_TIME,
    DRAW_TEAM,
    EXTENSIONS,
    HEAD_FORMAT,
    MAGIC,
    MAX_BLOCKS,
    MAX_HEADER_BLOCK_BYTES,
    NAME_STAMP,
    OWN_STATS,
    RECORDING_NAME,
    RESULT_DRAW,
    RESULT_LOSS,
    RESULT_WIN,
    SIZE_FORMAT,
)


def is_replay_name(name):
    lower = to_text(name).lower()
    return lower.endswith(EXTENSIONS) and RECORDING_NAME.match(os.path.basename(lower)) is None


def _read_exact(handle, size):
    data = handle.read(size)
    return data if data is not None and len(data) == size else None


def _block_cap(index):
    return MAX_HEADER_BLOCK_BYTES[min(index, len(MAX_HEADER_BLOCK_BYTES) - 1)]


# Python 2's json raises RuntimeError on deeply nested arrays or objects.
def _json_block(raw):
    try:
        return decode_json(to_text(raw, 'utf-8'))
    except (ValueError, UnicodeDecodeError, RuntimeError):
        return None


def read_json_blocks(handle, limit=2):
    head = _read_exact(handle, 8)
    if head is None:
        return None
    magic, count = struct.unpack(HEAD_FORMAT, head)
    if magic != MAGIC or count < 1 or count > MAX_BLOCKS:
        return None
    blocks = []
    for index in range(min(count, limit)):
        size_raw = _read_exact(handle, 4)
        if size_raw is None:
            return None
        size = struct.unpack(SIZE_FORMAT, size_raw)[0]
        if size > _block_cap(index):
            return None
        raw = _read_exact(handle, size)
        if raw is None:
            return None
        blocks.append(_json_block(raw))
    return blocks


def parse_date_time(value):
    """The arena block's local "dd.mm.YYYY HH:MM:SS" as epoch seconds (local clock), or None."""
    if not isinstance(value, string_types):
        return None
    match = DATE_TIME.match(to_text(value))
    if match is None:
        return None
    day, month, year, hour, minute, second = [int(part) for part in match.groups()]
    try:
        return float(time.mktime((year, month, day, hour, minute, second, 0, 0, -1)))
    except (OverflowError, ValueError):
        return None


def name_time(name):
    """The local start of the battle a replay file name starts with (YYYYMMDD_HHMM_, minutes) as epoch seconds,
    or None for a name without it (a renamed replay)."""
    match = NAME_STAMP.match(os.path.basename(to_text(name)))
    if match is None:
        return None

    year, month, day, hour, minute = [int(part) for part in match.groups()]
    try:
        return float(time.mktime((year, month, day, hour, minute, 0, 0, 0, -1)))
    except (OverflowError, ValueError):
        return None


def same_vehicle(header_vehicle, vehicle_name):
    """Whether a header's playerVehicle (ussr-R04_T-34) is the client's vehicle type name (ussr:R04_T-34); True when
    either is unknown."""
    if not header_vehicle or not vehicle_name:
        return True

    return to_text(header_vehicle) == to_text(vehicle_name).replace(u':', u'-')


def _text_or_none(value):
    return to_text(value) if isinstance(value, string_types) and value else None


def _own_vehicle(personal):
    for key, value in personal.items():
        if key != AVATAR_KEY and isinstance(value, dict) and 'damageDealt' in value:
            return value
    return None


def _dict_of(value, key):
    found = value.get(key) if isinstance(value, dict) else None
    return found if isinstance(found, dict) else {}


def _ints(source, names):
    return {ours: source[theirs] for theirs, ours in names if is_int(source.get(theirs))}


# Fair play: the recorder's own personal entry and the winner team only.
def own_outcome(results):
    own = _own_vehicle(_dict_of(results, 'personal'))
    common = _dict_of(results, 'common')
    if own is None:
        return None, None
    damage = own.get('damageDealt') if is_int(own.get('damageDealt')) else None
    team = own.get('team')
    winner = common.get('winnerTeam')
    if not is_int(team) or not is_int(winner):
        return None, damage
    return _team_result(team, winner), damage


def _team_result(team, winner):
    if winner == DRAW_TEAM:
        return RESULT_DRAW
    return RESULT_WIN if winner == team else RESULT_LOSS


def own_stats(results):
    own = _own_vehicle(_dict_of(results, 'personal'))
    if own is None:
        return None
    stats = _ints(own, OWN_STATS)
    stats.update(_ints(_dict_of(results, 'common'), COMMON_STATS))
    assists = [stats[key] for key in ASSIST_KEYS if key in stats]
    stats['assist'] = sum(assists) if assists else None
    death = own.get('deathReason')
    stats['survived'] = death == ALIVE_DEATH_REASON if is_int(death) else None
    return stats


def _arena_id(arena, first):
    for source in (arena, first):
        value = source.get('arenaUniqueID') if isinstance(source, dict) else None
        if is_int(value) and value > 0:
            return to_text(value)
    return None


def read_header_from(handle):
    """{player_id, player_name, arena_unique_id, date_time, map_name, map_title, vehicle, battle_type, gameplay,
    client_version, server, result, damage, stats} from the header blocks, or None. `stats` (the recorder's own
    results entry) and `result`/`damage` are None when the battle was left before its end."""
    blocks = read_json_blocks(handle)
    if not blocks or not isinstance(blocks[0], dict):
        return None

    arena = blocks[0]
    first = _first_results(blocks)
    header = _arena_header(arena, first)
    if first is not None:
        header['result'], header['damage'] = own_outcome(first)
        header['stats'] = own_stats(first)
    return header


def _first_results(blocks):
    results = blocks[1] if len(blocks) > 1 else None
    if not isinstance(results, list) or not results:
        return None
    return results[0] if isinstance(results[0], dict) else None


def _arena_header(arena, first):
    return {
        'player_id': arena.get('playerID') if is_int(arena.get('playerID')) else None,
        'player_name': _text_or_none(arena.get('playerName')),
        'date_time': parse_date_time(arena.get('dateTime')),
        'arena_unique_id': _arena_id(arena, first),
        'map_name': _text_or_none(arena.get('mapName')),
        'map_title': _text_or_none(arena.get('mapDisplayName')),
        'vehicle': _text_or_none(arena.get('playerVehicle')),
        'battle_type': arena.get('battleType') if is_int(arena.get('battleType')) else None,
        'gameplay': _text_or_none(arena.get('gameplayID')),
        'client_version': _text_or_none(arena.get('clientVersionFromExe')),
        'server': _text_or_none(arena.get('serverName')),
        'result': None,
        'damage': None,
        'stats': None,
    }


def read_header(path):
    try:
        with io.open(path, 'rb') as handle:
            return read_header_from(handle)
    except (IOError, OSError, struct.error):
        return None
