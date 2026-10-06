"""The keyboard focus of the HUD window: it never keeps it.

The HUD page has no text field and draws over the client's own page, so a focus the client gives the HUD window is
handed on to the window under it. `focus_target(windows)` picks that window from `WindowInfo`s (the topmost ready
window on the client's page and dialog layers, the last of a layer when several are; None when there is none), and
`FocusReturn.decide(now, editing)` says what to do with a focus the window was just given: hand it on, wait while the
player drags a panel, or give up after the client gave it back several times in a row. The client side is
`core/client/hud/gameface`.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from collections import namedtuple

from .constants import (
    BOUNCE_SECONDS,
    FOCUS_GIVE_UP,
    FOCUS_HAND_ON,
    FOCUS_KEEP,
    FOCUS_LAYERS,
    FOCUS_WAIT,
    MAX_BOUNCES,
    TOOLTIP_TYPE,
)

__all__ = ('FOCUS_GIVE_UP', 'FOCUS_HAND_ON', 'FOCUS_KEEP', 'FOCUS_WAIT', 'FocusReturn', 'WindowInfo', 'focus_target')

WindowInfo = namedtuple('WindowInfo', 'key layer type_flag ready')


def can_take_focus(window):
    low, high = FOCUS_LAYERS
    return window.ready and low <= window.layer <= high and window.type_flag != TOOLTIP_TYPE


def focus_target(windows):
    best = None
    for window in windows:
        if can_take_focus(window) and (best is None or window.layer >= best.layer):
            best = window
    return best.key if best is not None else None


class FocusReturn(object):

    def __init__(self):
        self.handed_at = None
        self.bounces = 0

    def decide(self, now, editing):
        if editing:
            return FOCUS_WAIT
        if self._bounced(now):
            self.bounces += 1
        else:
            self.bounces = 0
        if self.bounces < MAX_BOUNCES:
            return FOCUS_HAND_ON
        return FOCUS_GIVE_UP if self.bounces == MAX_BOUNCES else FOCUS_KEEP

    def handed_on(self, now):
        self.handed_at = now

    def _bounced(self, now):
        return now is not None and self.handed_at is not None and now - self.handed_at < BOUNCE_SECONDS
