"""The renderer interface of the HUD layer.

`core/client/hud/` implements it with OpenWG Gameface (the ui package's HUD page); `NullBackend` stands in while
OpenWG Gameface or the client's inject classes are missing. Props are the label names (x, y, alignX, alignY, alpha,
drag, border, text, visible, scale, widget, dock, attach).
"""
from __future__ import absolute_import, division, print_function, unicode_literals


class HudBackend(object):

    name = 'none'

    def available(self):
        """Whether it can draw now (the page may not be registered yet)."""
        return False

    def create(self, alias, props):
        """Create a label; a truthy return means it exists now."""
        return False

    def update(self, alias, props):
        return False

    def delete(self, alias):
        return False

    def listen(self, on_moved):
        """Call `on_moved(alias, props)` when the player drags or resizes a panel (props: x, y, optional alignX/alignY,
        or scale); every listener is called."""

    def drawn_aliases(self):
        """The labels the renderer confirmed on the screen (laid out with a size), or None while it confirmed nothing
        (only the Gameface page reports them). A panel replaces a stock element only while it is in there."""

    def listen_drawn(self, on_drawn):
        """Call `on_drawn()` when `drawn_aliases()` changed."""

    def set_modifier(self, mode):
        """The key the player holds to move and resize panels (`core.hud.modifier` modes)."""


class NullBackend(HudBackend):
    """No renderer installed: every panel stays hidden, features fall back to notifications."""
