from __future__ import absolute_import, division, print_function, unicode_literals

import json

from ....core.compat import clamp, is_int, is_number, string_types, to_text
from .constants import (
    COMMAND_BATTLE,
    COMMAND_DIAG,
    COMMAND_MOVE,
    COMMAND_SELECT,
    COMMAND_TAB,
    COMMANDS,
    MAX_MESSAGE_CHARS,
    MAX_MOVE,
    MOVE_FIELDS,
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


def _valid_move(fields):
    return all(is_number(fields[key]) for key in MOVE_FIELDS)


VALIDATORS = {
    COMMAND_TAB: _valid_tab,
    COMMAND_SELECT: _valid_select,
    COMMAND_BATTLE: _valid_battle,
    COMMAND_DIAG: _valid_diag,
    COMMAND_MOVE: _valid_move,
}


def _valid(command, fields):
    validator = VALIDATORS.get(command)
    return validator is None or validator(fields)


def _clamped(fields):
    return {key: clamp(float(value), -MAX_MOVE, MAX_MOVE) for key, value in fields.items()}


def _message(raw):
    if not isinstance(raw, string_types) or len(raw) > MAX_MESSAGE_CHARS:
        return None
    try:
        message = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(message, dict) or message.get('command') not in COMMANDS:
        return None
    return message


def _text_fields(fields):
    for key in TEXT_FIELDS.values():
        if key in fields and isinstance(fields[key], string_types):
            fields[key] = to_text(fields[key])
    return fields


def decode_message(raw):
    message = _message(raw)
    if message is None:
        return None
    command = message['command']
    needed = COMMANDS[command]
    if any(key not in message for key in needed):
        return None
    fields = _text_fields({key: message[key] for key in needed})
    if not _valid(command, fields):
        return None
    if command == COMMAND_MOVE:
        return command, _clamped(fields)
    return command, fields
