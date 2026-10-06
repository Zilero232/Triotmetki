from __future__ import absolute_import, division, print_function, unicode_literals

import json

from ....core.compat import is_int, is_number, string_types, to_text
from .constants import COMMANDS, MAX_MESSAGE_CHARS, MAX_MOVE, SIDES

MOVE_FIELDS = COMMANDS['move']
TEXT_FIELDS = {'battle': 'id', 'diag': 'text'}


def _valid(command, fields):
    if command == 'tab':
        return fields['tab'] in SIDES
    if command == 'select':
        return is_int(fields['index']) and fields['index'] >= 0
    if command in TEXT_FIELDS:
        value = fields[TEXT_FIELDS[command]]
        return isinstance(value, string_types) and bool(value)
    if command == 'move':
        return all(is_number(fields[key]) for key in MOVE_FIELDS)
    return True


def _clamped(fields):
    return dict((key, max(-MAX_MOVE, min(MAX_MOVE, float(value)))) for key, value in fields.items())


def decode_message(raw):
    if not isinstance(raw, string_types) or len(raw) > MAX_MESSAGE_CHARS:
        return None
    try:
        message = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(message, dict) or message.get('command') not in COMMANDS:
        return None
    command = message['command']
    needed = COMMANDS[command]
    if any(key not in message for key in needed):
        return None
    fields = dict((key, message[key]) for key in needed)
    for key in TEXT_FIELDS.values():
        if key in fields and isinstance(fields[key], string_types):
            fields[key] = to_text(fields[key])
    if not _valid(command, fields):
        return None
    return (command, _clamped(fields)) if command == 'move' else (command, fields)
