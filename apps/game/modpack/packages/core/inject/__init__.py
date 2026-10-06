"""Gameface pages inside the client's Scaleform views (pure): the rules of the inject host and its dev spike.

The client draws a Gameface `ViewImpl` inside a Scaleform view through the stock `GFInjectComponent` and an
`InjectComponentAdaptor` (core/client/inject); docs/specs/2026-10-06-gameface-inject-host.md. This half decides
what needs no client: whether the dev spike runs, its input modes and its label text.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import (
    GF_INJECT_CLASS,
    INVALID_RES_ID,
    PAGE_MESSAGE_ARG,
    PAGE_SEND_COMMAND,
    PAGE_STATE_PROPERTY,
    SPIKE_CLOCK,
    SPIKE_ENV,
    SPIKE_ENV_ON,
    SPIKE_MODES,
    SPIKE_TEXT,
)

__all__ = (
    'GF_INJECT_CLASS',
    'INVALID_RES_ID',
    'PAGE_MESSAGE_ARG',
    'PAGE_SEND_COMMAND',
    'PAGE_STATE_PROPERTY',
    'SpikeMode',
    'message_of',
    'spike_enabled',
    'spike_text',
    'valid_layout',
)


def spike_enabled(environ, flag_exists, dev):
    """Whether the inject spike runs: only in a dev install, and only when asked for by the environment or the flag."""
    return bool(dev) and (environ.get(SPIKE_ENV) == SPIKE_ENV_ON or bool(flag_exists))


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


class SpikeMode(object):
    """The spike's input mode, cycled by its hotkey: `name`, `edit` (the page takes the mouse over its whole area) and
    `mouse` (the Scaleform side lets the mouse reach the injected view)."""

    def __init__(self, index=0):
        self.index = index % len(SPIKE_MODES)

    @property
    def name(self):
        return SPIKE_MODES[self.index][0]

    @property
    def edit(self):
        return SPIKE_MODES[self.index][1]

    @property
    def mouse(self):
        return SPIKE_MODES[self.index][2]

    def next(self):
        return SpikeMode(self.index + 1)


def spike_text(mode_name, moment):
    """The spike label: the mode and the time of `moment` (a datetime), ASCII only."""
    return SPIKE_TEXT % (mode_name, moment.strftime(str(SPIKE_CLOCK)))
