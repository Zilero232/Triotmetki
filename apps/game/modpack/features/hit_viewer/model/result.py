from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int
from .constants import RESULT_DRAW, RESULT_LOSS, RESULT_WIN


def _own_vehicle(personal):
    for key, value in personal.items():
        if key == 'avatar':
            continue
        entry = value[0] if isinstance(value, list) and value else value
        if isinstance(entry, dict) and 'typeCompDescr' in entry:
            return entry
    return {}


def battle_result(results):
    """'win', 'loss' or 'draw' of the player's own team in the client's battle results, or None when they do not say;
    only the own `personal` block and the `common` winner are read (fair play)."""
    if not isinstance(results, dict):
        return None
    personal = results.get('personal') or {}
    avatar = personal.get('avatar') or {}
    team = _own_vehicle(personal).get('team') or avatar.get('team')
    winner = (results.get('common') or {}).get('winnerTeam')
    if not is_int(team) or not is_int(winner):
        return None
    if winner == 0:
        return RESULT_DRAW
    return RESULT_WIN if winner == team else RESULT_LOSS
