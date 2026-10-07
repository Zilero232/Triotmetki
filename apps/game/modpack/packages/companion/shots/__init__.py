from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import is_int, is_number
from ...core.shells import shell_code
from .constants import KIND_BY_CODE, MAX_DAMAGE, MAX_DISTANCE_M, MAX_SHOTS, OUTCOMES, SHELL_KINDS, UNKNOWN_SHELL


# RU 1.45 battle feedback BATTLE_LOG_SHELL_TYPES member, its name or index, or a descriptor kind string.
def normalize_shell(raw):
    return KIND_BY_CODE.get(shell_code(raw), UNKNOWN_SHELL)


def _nominal_matches(options, shell):
    matches = []
    for option in options or ():
        if not isinstance(option, (list, tuple)) or len(option) < 3:
            continue
        kind, damage, gold = option[:3]
        if normalize_shell(kind) == shell and is_number(damage) and damage > 0:
            matches.append((bool(gold), int(damage)))
    return matches


def nominal_for(options, shell, is_gold=None):
    matches = _nominal_matches(options, shell)
    if not matches:
        return None
    if is_gold is not None:
        preferred = [damage for gold, damage in matches if gold == bool(is_gold)]
        if preferred:
            return preferred[0]
    return matches[0][1]


def build_shot(damage, nominal, shell, outcome='damage', distance_m=None, fatal=False):
    if not is_number(damage) or damage < 0 or outcome not in OUTCOMES:
        return None
    has_nominal = is_number(nominal) and 0 < nominal <= MAX_DAMAGE
    has_distance = is_number(distance_m) and 0 <= distance_m <= MAX_DISTANCE_M
    return {
        'damage': min(int(damage), MAX_DAMAGE),
        'nominal': int(nominal) if has_nominal else None,
        'shell': shell if shell in SHELL_KINDS else UNKNOWN_SHELL,
        'outcome': outcome,
        'distance_m': int(round(distance_m)) if has_distance else None,
        'fatal': bool(fatal),
    }


class ShotLog(object):

    def __init__(self):
        self.shots = []

    def add(self, shot):
        if shot is None or len(self.shots) >= MAX_SHOTS:
            return False
        self.shots.append(shot)
        return True

    def mark_fatal(self, index):
        if is_int(index) and 0 <= index < len(self.shots):
            self.shots[index]['fatal'] = True

    def take(self):
        shots = self.shots
        self.shots = []
        return shots
