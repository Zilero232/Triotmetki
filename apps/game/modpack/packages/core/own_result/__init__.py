"""The own team's result in the client's battle results. Pure.

Fair play: only the own `personal` block (the own vehicle's entry and the avatar) and the `common` winner are read,
never the `vehicles`, `players` or `avatars` blocks of the other players."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import int_or_none
from .constants import AVATAR_KEY, DRAW_TEAM, RESULT_DRAW, RESULT_LOSS, RESULT_TONES, RESULT_WIN, VEHICLE_MARK

__all__ = ('AVATAR_KEY', 'RESULT_DRAW', 'RESULT_LOSS', 'RESULT_TONES', 'RESULT_WIN', 'own_result', 'own_vehicle')


def own_vehicle(personal):
    """The own vehicle's entry of the results' `personal` block (the first one of a list), or {}."""
    for key, value in personal.items():
        if key == AVATAR_KEY:
            continue
        entry = value[0] if isinstance(value, list) and value else value
        if isinstance(entry, dict) and VEHICLE_MARK in entry:
            return entry
    return {}


def own_result(results):
    """'win', 'loss' or 'draw' of the player's own team in `results`, or None when they do not say."""
    if not isinstance(results, dict):
        return None
    personal = results.get('personal') or {}
    avatar = personal.get(AVATAR_KEY) or {}
    team = int_or_none(own_vehicle(personal).get('team')) or int_or_none(avatar.get('team'))
    winner = int_or_none((results.get('common') or {}).get('winnerTeam'))
    if team is None or winner is None:
        return None
    if winner == DRAW_TEAM:
        return RESULT_DRAW
    return RESULT_WIN if winner == team else RESULT_LOSS
