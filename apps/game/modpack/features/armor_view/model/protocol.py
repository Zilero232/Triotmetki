from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import clamp, fraction, is_finite_number, is_int, string_types
from ....core.sub_view import clamped_move, is_move, parse_message
from .constants import (
    COMMAND_ATTACKER,
    COMMAND_CAMERA,
    COMMAND_DIAG,
    COMMAND_DISTANCE,
    COMMAND_HOVER,
    COMMAND_MODE,
    COMMAND_MODULES,
    COMMAND_MOVE,
    COMMAND_SEARCH,
    COMMAND_SHELL,
    COMMAND_TANK,
    COMMANDS,
    DISTANCE_LIMITS,
    DISTANCE_STEP,
    MAX_MESSAGE_CHARS,
    MODES,
)
from .presets import PRESET_IDS
from .tanks import clean_query


def _is_id(value):
    return is_int(value) and value > 0


def _valid_hover(fields):
    return is_finite_number(fields['x']) and is_finite_number(fields['y'])


def _valid_shell(fields):
    return is_int(fields['index']) and fields['index'] >= 0


def _valid_modules(fields):
    return _is_id(fields['turret']) and _is_id(fields['gun'])


def _valid_text(fields):
    return isinstance(fields['text'], string_types)


def _valid_diag(fields):
    return _valid_text(fields) and bool(fields['text'])


VALIDATORS = {
    COMMAND_MOVE: is_move,
    COMMAND_HOVER: _valid_hover,
    COMMAND_MODE: lambda fields: fields['mode'] in MODES,
    COMMAND_SHELL: _valid_shell,
    COMMAND_DISTANCE: lambda fields: is_finite_number(fields['m']),
    COMMAND_TANK: lambda fields: _is_id(fields['cd']),
    COMMAND_ATTACKER: lambda fields: _is_id(fields['cd']),
    COMMAND_MODULES: _valid_modules,
    COMMAND_SEARCH: _valid_text,
    COMMAND_CAMERA: lambda fields: fields['preset'] in PRESET_IDS,
    COMMAND_DIAG: _valid_diag,
}


def stepped_distance(metres):
    low, high = DISTANCE_LIMITS
    held = clamp(float(metres), low, high)
    return int(round(held / DISTANCE_STEP)) * DISTANCE_STEP


def _hover(fields):
    return {'x': fraction(float(fields['x'])), 'y': fraction(float(fields['y']))}


NORMALIZERS = {
    COMMAND_MOVE: clamped_move,
    COMMAND_HOVER: _hover,
    COMMAND_DISTANCE: lambda fields: {'m': stepped_distance(fields['m'])},
    COMMAND_SEARCH: lambda fields: {'text': clean_query(fields['text'])},
}


def decode_message(raw):
    decoded = parse_message(raw, COMMANDS, MAX_MESSAGE_CHARS)
    if decoded is None:
        return None
    command, fields = decoded

    validator = VALIDATORS.get(command)
    if validator is not None and not validator(fields):
        return None
    normalizer = NORMALIZERS.get(command)
    if normalizer is not None:
        fields = normalizer(fields)
    return command, fields
