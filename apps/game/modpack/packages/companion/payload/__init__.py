from __future__ import absolute_import, division, print_function, unicode_literals

import uuid

from ...core.compat import as_int, is_int, string_types, to_text
from ...core.moe import results_rating
from ...core.own_result import AVATAR_KEY
from ..loadout import normalize_loadout
from ..shots import MAX_SHOTS
from .constants import (
    COST_FIELDS,
    MASTERY_BADGES,
    MAX_ACHIEVEMENT_NAME,
    MAX_ACHIEVEMENTS,
    MAX_PLATOON_SIZE,
    REALM,
    SCHEMA_VERSION,
    STAT_FIELDS,
)


class PayloadError(Exception):
    pass


def new_event_id():
    return uuid.uuid4().hex


def _first_dict(value):
    if isinstance(value, dict):
        return value
    if isinstance(value, (list, tuple)) and value and isinstance(value[0], dict):
        return value[0]
    return None


def _credits_part(value):
    if is_int(value):
        return value
    if isinstance(value, (list, tuple)) and value and is_int(value[0]):
        return value[0]
    return None


def extract_economy(vehicle):
    economy = {}
    free_xp = vehicle.get('freeXP')
    if is_int(free_xp) and free_xp >= 0:
        economy['free_xp'] = free_xp
    for target, source in COST_FIELDS:
        value = _credits_part(vehicle.get(source))
        if value is not None and value >= 0:
            economy[target] = value
    return economy


def find_own_vehicle(results):
    personal = results.get('personal')
    if not isinstance(personal, dict):
        raise PayloadError('no personal block')
    for key, value in personal.items():
        if key == AVATAR_KEY:
            continue
        vehicle = _first_dict(value)
        if vehicle is not None and 'typeCompDescr' in vehicle:
            return vehicle
    raise PayloadError('no personal vehicle')


def battle_outcome(winner_team, team):
    if winner_team == 0:
        return 'draw'
    return 'win' if winner_team == team else 'loss'


# The results' damageRating is a whole percent; the event carries it in the dossier's hundredths (core.moe.results).
def extract_moe(vehicle):
    rating = results_rating(vehicle.get('damageRating'))
    moving_avg = vehicle.get('movingAvgDamage')
    if rating is None or not is_int(moving_avg):
        return None
    return {
        'marks_on_gun': as_int(vehicle.get('marksOnGun')),
        'damage_rating': rating,
        'moving_avg_damage': moving_avg,
    }


def _player_key(value):
    if is_int(value):
        return value
    if isinstance(value, string_types) and value.isdigit():
        return int(value)
    return None


# Fair play / privacy: the players block is read only to count the own platoon (same prebattleID on the
# own team); the size is all that leaves the client, never another player's account id or name.
def _players_by_id(players):
    by_id = {}
    for key, value in players.items():
        player_id = _player_key(key)
        if player_id is not None and isinstance(value, dict):
            by_id[player_id] = value
    return by_id


def _is_platoon_mate(player, own):
    same_platoon = player.get('prebattleID') == own.get('prebattleID')
    return same_platoon and player.get('team') == own.get('team')


def extract_platoon(results, account_id):
    players = results.get('players')
    if not isinstance(players, dict) or not is_int(account_id):
        return None
    by_id = _players_by_id(players)
    own = by_id.get(account_id)
    if own is None:
        return None
    prebattle = own.get('prebattleID')
    if not is_int(prebattle) or prebattle <= 0:
        return None

    mates = [
        player for player_id, player in by_id.items()
        if player_id != account_id and _is_platoon_mate(player, own)
    ]
    size = 1 + len(mates)
    if size < 2:
        return None
    return {'size': min(size, MAX_PLATOON_SIZE)}


def normalize_shots(shots):
    if not isinstance(shots, (list, tuple)):
        return None
    result = [shot for shot in shots if isinstance(shot, dict)][:MAX_SHOTS]
    return result or None


def _record_ids(vehicle):
    ids = vehicle.get('achievements')
    if not isinstance(ids, (list, tuple)):
        return []
    return [record_id for record_id in ids if is_int(record_id)]


def _is_achievement_name(name):
    return isinstance(name, string_types) and 0 < len(name) <= MAX_ACHIEVEMENT_NAME


def extract_achievements(vehicle, name_of):
    names = []
    mastery = MASTERY_BADGES.get(as_int(vehicle.get('markOfMastery')))
    if mastery is not None:
        names.append(mastery)
    for record_id in _record_ids(vehicle):
        name = name_of(record_id)
        if _is_achievement_name(name) and name not in names:
            names.append(to_text(name))
    return names[:MAX_ACHIEVEMENTS]


def extract_stats(vehicle):
    death_reason = as_int(vehicle.get('deathReason'), -1)
    stats = {target: as_int(vehicle.get(source)) for target, source in STAT_FIELDS}
    stats['is_alive'] = death_reason == -1
    stats['death_reason'] = death_reason
    stats['is_premium'] = bool(vehicle.get('isPremium', False))
    stats.update(extract_economy(vehicle))
    return stats


def _arena_unique_id(results):
    if not isinstance(results, dict):
        raise PayloadError('results must be a dict')
    arena_unique_id = results.get('arenaUniqueID')
    if not is_int(arena_unique_id) or arena_unique_id <= 0:
        raise PayloadError('no arenaUniqueID')
    return arena_unique_id


def _arena_fields(common, extras):
    created_at = as_int(common.get('arenaCreateTime'))
    duration = as_int(common.get('duration'))
    return {
        'occurred_at': as_int(extras.get('occurred_at'), created_at + duration),
        'arena_type_id': as_int(common.get('arenaTypeID')),
        'map_name': extras.get('map_name'),
        'bonus_type': as_int(common.get('bonusType')),
        'gui_type': as_int(common.get('guiType')),
        'arena_created_at': created_at,
        'duration_s': duration,
        'finish_reason': as_int(common.get('finishReason')),
        'winner_team': as_int(common.get('winnerTeam')),
    }


def _no_achievement_name(record_id):
    return None


def build_battle_event(results, extras=None):
    extras = extras or {}
    arena_unique_id = _arena_unique_id(results)
    common = results.get('common') or {}
    avatar = (results.get('personal') or {}).get('avatar') or {}
    vehicle = find_own_vehicle(results)
    team = as_int(vehicle.get('team'), as_int(avatar.get('team'), 0))
    achievement_name = extras.get('achievement_name') or _no_achievement_name

    event = _arena_fields(common, extras)
    event.update({
        'type': 'battle_result',
        'event_id': 'battle:' + str(arena_unique_id),
        'arena_unique_id': str(arena_unique_id),
        'team': team,
        'result': battle_outcome(event['winner_team'], team),
        'vehicle': {
            'tank_id': as_int(vehicle.get('typeCompDescr')),
            'name': extras.get('vehicle_name'),
            'tier': extras.get('vehicle_tier'),
        },
        'stats': extract_stats(vehicle),
        'moe': extract_moe(vehicle),
        'queue_time_s': extras.get('queue_time_s'),
        'session_id': extras.get('session_id'),
        'loadout': normalize_loadout(extras.get('loadout'), event['arena_type_id']),
        'platoon': extract_platoon(results, as_int(avatar.get('accountDBID'), None)),
        'shots': normalize_shots(extras.get('shots')),
        'achievements': extract_achievements(vehicle, achievement_name),
    })
    return event


def build_moe_snapshot_event(tank_id, damage_rating, moving_avg_damage, marks_on_gun, battles, occurred_at):
    return {
        'type': 'moe_snapshot',
        'event_id': new_event_id(),
        'occurred_at': int(occurred_at),
        'tank_id': int(tank_id),
        'damage_rating': int(damage_rating),
        'moving_avg_damage': int(moving_avg_damage),
        'marks_on_gun': int(marks_on_gun),
        'battles': int(battles) if is_int(battles) else None,
    }


def build_queue_event(queue_type, wait_s, outcome, occurred_at, tank_id=None):
    return {
        'type': 'queue',
        'event_id': new_event_id(),
        'occurred_at': int(occurred_at),
        'queue_type': as_int(queue_type),
        'wait_s': round(max(0.0, float(wait_s)), 1),
        'outcome': outcome,
        'tank_id': tank_id if is_int(tank_id) else None,
    }


def build_battle_start_event(occurred_at, tank_id=None):
    return {
        'type': 'battle_start',
        'event_id': new_event_id(),
        'occurred_at': int(occurred_at),
        'tank_id': tank_id if is_int(tank_id) else None,
    }


def build_envelope(events, device_id, account_id, mod_version, client_version, sent_at, batch_id=None):
    if not isinstance(device_id, string_types) or not device_id:
        raise PayloadError('device_id required')
    return {
        'schema_version': SCHEMA_VERSION,
        'batch_id': batch_id or new_event_id(),
        'device_id': device_id,
        'account_id': account_id,
        'realm': REALM,
        'mod_version': mod_version,
        'client_version': to_text(client_version or ''),
        'sent_at': int(sent_at),
        'events': list(events),
    }
