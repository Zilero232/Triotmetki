from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, string_types
from ....core.sub_view import clamped_move, is_move, parse_message
from .constants import (
    COMMAND_BATTLE,
    COMMAND_DIAG,
    COMMAND_MOVE,
    COMMAND_SELECT,
    COMMAND_TAB,
    COMMANDS,
    MAX_MESSAGE_CHARS,
    SIDES,
    TEXT_FIELDS,
)


def _is_text(value):
    return isinstance(value, string_types) and bool(value)


def _valid_tab(fields):
    return fields['tab'] in SIDES


def _valid_select(fields):
    return is_int(fields['index']) and fields['index'] >= 0


def _valid_battle(fields):
    return _is_text(fields[TEXT_FIELDS[COMMAND_BATTLE]])


def _valid_diag(fields):
    return _is_text(fields[TEXT_FIELDS[COMMAND_DIAG]])


VALIDATORS = {
    COMMAND_TAB: _valid_tab,
    COMMAND_SELECT: _valid_select,
    COMMAND_BATTLE: _valid_battle,
    COMMAND_DIAG: _valid_diag,
    COMMAND_MOVE: is_move,
}


def _valid(command, fields):
    validator = VALIDATORS.get(command)
    return validator is None or validator(fields)


def decode_message(raw):
    decoded = parse_message(raw, COMMANDS, MAX_MESSAGE_CHARS)
    if decoded is None:
        return None
    command, fields = decoded
    if not _valid(command, fields):
        return None
    if command == COMMAND_MOVE:
        return command, clamped_move(fields)
    return command, fields
