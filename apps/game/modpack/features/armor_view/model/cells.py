from __future__ import absolute_import, division, print_function, unicode_literals

import bisect

from ....core.armor import (
    KIND_GUN,
    KIND_SPACED,
    KIND_TRACK,
    PENETRATION_RANDOMNESS,
    VERDICT_ALWAYS,
    VERDICT_CHANCE,
    VERDICT_NEVER,
    VERDICT_RICOCHET,
    first_main,
    trace,
    verdict,
)
from ....core.vendor import attr
from .constants import (
    CELL_ALPHABET,
    CHANCE_TONES,
    MODE_NOMINAL,
    MODE_SHELL,
    PATTERN_NONE,
    PATTERN_SCREEN,
    PATTERN_STEP,
    PATTERN_TRACK,
    THICKNESS_STOPS,
    TONE_ALWAYS,
    TONE_EMPTY,
    TONE_GUN,
    TONE_NEVER,
    TONE_RICOCHET,
    TONE_SPACED,
    TONE_TRACK,
)

FIXED_TONES = {KIND_SPACED: TONE_SPACED, KIND_TRACK: TONE_TRACK, KIND_GUN: TONE_GUN}
PATTERNS = {KIND_SPACED: PATTERN_SCREEN, KIND_GUN: PATTERN_SCREEN, KIND_TRACK: PATTERN_TRACK}
VERDICT_TONES = {VERDICT_ALWAYS: TONE_ALWAYS, VERDICT_NEVER: TONE_NEVER, VERDICT_RICOCHET: TONE_RICOCHET}


@attr.s(frozen=True)
class Attack(object):
    """A shell at the chosen distance: its penetration `power` there (mm) and the roll's `randomness`."""

    shell = attr.ib()
    power = attr.ib()
    randomness = attr.ib(default=PENETRATION_RANDOMNESS)


def thickness_tone(armor):
    """The thickness tone (1..12) of `armor` mm."""
    return 1 + bisect.bisect_left(THICKNESS_STOPS, armor)


def chance_tone(chance):
    for lowest, tone in CHANCE_TONES:
        if chance >= lowest:
            return tone
    return CHANCE_TONES[-1][1]


def front_pattern(plates, main_index):
    """The hatch of what lies in front of the main plate: a track over a screen or the gun, none without either."""
    if main_index is None:
        return PATTERN_NONE
    patterns = [PATTERNS.get(plate.kind, PATTERN_NONE) for plate in plates[:main_index]]
    return max(patterns or [PATTERN_NONE])


def fixed_tone(plates):
    return FIXED_TONES.get(plates[0].kind, TONE_SPACED)


def shell_tone(plates, attack):
    shell_verdict = verdict(trace(plates, attack.shell), attack.power, attack.randomness)
    if shell_verdict.name == VERDICT_CHANCE:
        return chance_tone(shell_verdict.chance)
    tone = VERDICT_TONES.get(shell_verdict.name)
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
    """The code of one cell: its tone (thickness, shell verdict or the fixed kind of a ray without a main plate) and
    the hatch of the screens or track in front, 0 for a ray that met no armour."""
    if not plates:
        return TONE_EMPTY
    main_index = first_main(plates)

    if mode == MODE_SHELL and attack is not None:
        tone = shell_tone(plates, attack)
    else:
        tone = _armour_tone(plates, main_index, mode)
    return tone + PATTERN_STEP * front_pattern(plates, main_index)


def encode_cells(codes):
    """The cells as one character each (CELL_ALPHABET), row by row."""
    return u''.join(CELL_ALPHABET[code] for code in codes)
