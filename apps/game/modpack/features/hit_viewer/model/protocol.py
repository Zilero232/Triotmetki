from __future__ import absolute_import, division, print_function, unicode_literals

import json

from ....core.compat import is_int, string_types, to_text
from .constants import COMMANDS, MAX_MESSAGE_CHARS, SIDES


def _valid(command, fields):
    if command == 'tab':
        return fields['tab'] in SIDES
    if command == 'select':
        return is_int(fields['index']) and fields['index'] >= 0
    if command == 'battle':
        return isinstance(fields['id'], string_types) and bool(fields['id'])
    return True


def decode_message(raw):
    """(command, fields) of a message the viewer page sent, or None for anything malformed."""
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
    if 'id' in fields and isinstance(fields['id'], string_types):
        fields['id'] = to_text(fields['id'])
    return (command, fields) if _valid(command, fields) else None
