"""Gameface pages inside the client's Scaleform views (pure): the rules of the inject host the HUD page uses.

The client draws a Gameface `ViewImpl` inside a Scaleform view through the stock `GFInjectComponent` and an
`InjectComponentAdaptor` (core/client/inject); docs/specs/2026-10-06-gameface-inject-host.md. This half decides
what needs no client: a res_map answer as a layout id, the message a page sent.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import (
    GF_INJECT_CLASS,
    INVALID_RES_ID,
    PAGE_MESSAGE_ARG,
    PAGE_SEND_COMMAND,
    PAGE_STATE_PROPERTY,
)

__all__ = (
    'GF_INJECT_CLASS',
    'INVALID_RES_ID',
    'PAGE_MESSAGE_ARG',
    'PAGE_SEND_COMMAND',
    'PAGE_STATE_PROPERTY',
    'message_of',
    'valid_layout',
)


def valid_layout(found):
    """A res_map lookup's answer as a layout id, or None while the key is unknown or not yet validated."""
    if isinstance(found, bool) or not isinstance(found, int) or found == INVALID_RES_ID:
        return None
    return found


def message_of(args):
    """The `message` a page sent through its command: the client passes a dict or a dict-like proxy."""
    if isinstance(args, dict):
        return args.get(PAGE_MESSAGE_ARG)
    getter = getattr(args, 'get', None)
    return getter(PAGE_MESSAGE_ARG) if getter is not None else None
