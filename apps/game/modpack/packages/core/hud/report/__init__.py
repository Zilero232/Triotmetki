"""What each battle panel is doing, as one log line: the diagnostic of a panel the player does not see.

`PanelReport(layer)` knows the panels that `track(panel_id, enabled)` named; a panel says why it has nothing to show
with `note(panel_id, reason)` (None once it has). `status(panel_id)` is one of: off (its switch), shown, shown but
hidden by a covering view, shown off-screen (its place points past its anchor edge, `panel.fit_place`), held by the
layer (the streamer hotkey, a streamer private panel, the battle type's layout), waiting (the panel's own reason) or
not published. `text(context, stock)` joins every tracked panel's status, then the battle page and the stock
aliases found on it and hidden (`stock`: `{page, found, hidden}` from the stock control, None off the page).

Pure (Python 2/3); the client side logs it once per battle (`core.client.hud.panel_report`).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ..panel import alias_of, fit_place
from .constants import (
    HELD_BLOCKED,
    HELD_LAYOUT,
    HELD_MUTED,
    REPORT_ENTRY,
    REPORT_NO_STOCK,
    REPORT_NONE,
    REPORT_PREFIX,
    REPORT_SEPARATOR,
    REPORT_STOCK,
    STATUS_HELD,
    STATUS_INVISIBLE,
    STATUS_OFF,
    STATUS_OFF_SCREEN,
    STATUS_SHOWN,
    STATUS_UNPUBLISHED,
    STATUS_WAITING,
)


class PanelReport(object):

    def __init__(self, layer):
        self.layer = layer
        self.enabled = {}
        self.notes = {}

    def track(self, panel_id, enabled):
        """Report `panel_id`; `enabled()` says whether its switch is on."""
        self.enabled[panel_id] = enabled

    def note(self, panel_id, reason):
        """Why the panel has nothing to show (None: it has, or it will say so again)."""
        if reason:
            self.notes[panel_id] = reason
        else:
            self.notes.pop(panel_id, None)

    def status(self, panel_id):
        if not self.enabled[panel_id]():
            return STATUS_OFF
        if not self.layer.allows(panel_id):
            return STATUS_HELD % (HELD_LAYOUT % self.layer.mode)
        if alias_of(panel_id) in self.layer.shown:
            return self._shown(panel_id)
        if panel_id in self.layer.held:
            return STATUS_HELD % self._held_reason(panel_id)
        if panel_id in self.notes:
            return STATUS_WAITING % self.notes[panel_id]
        return STATUS_UNPUBLISHED

    def _shown(self, panel_id):
        values = self.layer.place_values(panel_id)
        if fit_place(values):
            return STATUS_OFF_SCREEN % (values['x'], values['y'], values['align_x'], values['align_y'])
        return STATUS_INVISIBLE if self.layer.gui_hidden else STATUS_SHOWN

    def _held_reason(self, panel_id):
        if self.layer.muted:
            return HELD_MUTED
        if panel_id in self.layer.blocked:
            return HELD_BLOCKED
        return HELD_LAYOUT % self.layer.mode

    def text(self, context, stock=None):
        """One line: `context` (the battle type), every tracked panel's status by panel id, and the stock elements of
        the battle page (`{page, found, hidden}`, or None when there is no page)."""
        entries = [REPORT_ENTRY % (panel_id, self.status(panel_id)) for panel_id in sorted(self.enabled)]
        return REPORT_PREFIX % context + REPORT_SEPARATOR.join(entries) + _stock_text(stock)


def _names(aliases):
    return ', '.join(aliases) if aliases else REPORT_NONE


def _stock_text(stock):
    if not stock:
        return REPORT_NO_STOCK
    return REPORT_STOCK % (stock['page'], _names(stock['found']), _names(stock['hidden']))
