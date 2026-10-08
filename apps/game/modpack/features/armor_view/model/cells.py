from __future__ import absolute_import, division, print_function, unicode_literals

import bisect

from ....core.armor import PENETRATION_RANDOMNESS, VERDICT_CHANCE, first_main, trace, verdict
from ....core.vendor import attr
from .constants import (
    CELL_ALPHABET,
    CELL_VERDICT_TONES,
    CHANCE_TONES,
    FIXED_TONES,
    MODE_NOMINAL,
    MODE_SHELL,
    PATTERN_NONE,
    PATTERN_STEP,
    PATTERNS,
    THICKNESS_STOPS,
    TONE_EMPTY,
    TONE_SPACED,
)


@attr.s(frozen=True)
class Attack(object):
    shell = attr.ib()
    power = attr.ib()
    randomness = attr.ib(default=PENETRATION_RANDOMNESS)


def thickness_tone(armor):
    return 1 + bisect.bisect_left(THICKNESS_STOPS, armor)


def chance_tone(chance):
    for lowest, tone in CHANCE_TONES:
        if chance >= lowest:
            return tone
    return CHANCE_TONES[-1][1]


def front_pattern(plates, main_index):
    if main_index is None:
        return PATTERN_NONE
    patterns = [PATTERN_NONE]
    for plate in plates[:main_index]:
        patterns.append(PATTERNS.get(plate.kind, PATTERN_NONE))
    return max(patterns)


def fixed_tone(plates):
    return FIXED_TONES.get(plates[0].kind, TONE_SPACED)


def shell_tone(plates, attack):
    shell_verdict = verdict(trace(plates, attack.shell), attack.power, attack.randomness)
    if shell_verdict.name == VERDICT_CHANCE:
        return chance_tone(shell_verdict.chance)
    tone = CELL_VERDICT_TONES.get(shell_verdict.name)
    if tone is None:
        return fixed_tone(plates)
    return tone


def _armour_tone(plates, main_index, mode):
    if main_index is None:
        return fixed_tone(plates)
    main = plates[main_index]
    armor = main.armor if mode == MODE_NOMINAL else main.effective
    return thickness_tone(armor)


def cell_code(plates, mode, attack=None):
    if not plates:
        return TONE_EMPTY
    main_index = first_main(plates)

    if mode == MODE_SHELL and attack is not None:
        tone = shell_tone(plates, attack)
    else:
        tone = _armour_tone(plates, main_index, mode)
    return tone + PATTERN_STEP * front_pattern(plates, main_index)


def encode_cells(codes):
    characters = [CELL_ALPHABET[code] for code in codes]
    return u''.join(characters)
