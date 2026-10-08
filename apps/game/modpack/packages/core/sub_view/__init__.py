"""Gameface lobby sub views over the 3D hangar (pure): the page a view loads and the messages a page sends.

A feature's screen (hit_viewer, armor_view) is a Gameface page the client loads in place of the hangar view, the way
the stock views over the 3D hangar are; the glue is `core/client/sub_view`. This half needs no client: which res_map
item and view model properties a page has, and a page message as `(command, fields)`.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import json

from ..compat import clamp, is_number, string_types, to_text
from ..vendor import attr
from .constants import COMMAND_FIELD, MAX_MOVE, MOVE_FIELDS

__all__ = ('MOVE_FIELDS', 'SubViewPage', 'clamped_move', 'is_move', 'parse_message')


@attr.s(frozen=True)
class SubViewPage(object):
    """A page registered in the ui package's res_map under `key`, with the string properties of its view model in
    `properties` (the first one is its state)."""
    key = attr.ib()
    properties = attr.ib(converter=tuple)


def _decoded(raw, max_chars):
    if not isinstance(raw, string_types) or len(raw) > max_chars:
        return None
    try:
        message = json.loads(raw)
    except ValueError:
        return None
    return message if isinstance(message, dict) else None


def _as_text(value):
    return to_text(value) if isinstance(value, string_types) else value


def parse_message(raw, commands, max_chars):
    """`(command, fields)` of a page message: a JSON object whose `command` is a key of `commands` and that carries
    every field the command names (text fields as text); None for anything else."""
    message = _decoded(raw, max_chars)
    if message is None:
        return None
    command = message.get(COMMAND_FIELD)
    if command not in commands:
        return None

    needed = commands[command]
    if any(key not in message for key in needed):
        return None
    fields = {key: _as_text(message[key]) for key in needed}
    return command, fields


def is_move(fields):
    """Whether a camera move carries a number in each of `dx`, `dy`, `dz`."""
    return all(is_number(fields.get(key)) for key in MOVE_FIELDS)


def clamped_move(fields):
    """A camera move with each step held within the largest one a page may send."""
    return {key: clamp(float(fields[key]), -MAX_MOVE, MAX_MOVE) for key in MOVE_FIELDS}
