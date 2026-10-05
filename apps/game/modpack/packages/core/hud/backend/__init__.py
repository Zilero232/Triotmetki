"""The renderer interface of the HUD layer and the chain that picks a renderer at runtime.

`core/client/hud/` implements it with OpenWG Gameface (the ui package's HUD page) and GUIFlash. Props use
the GUIFlash label names (x, y, alignX, alignY, alpha, drag, border, text, visible); a backend maps them to
its own.
"""
from __future__ import absolute_import, division, print_function, unicode_literals


class HudBackend(object):

    name = 'none'

    def available(self):
        """Whether it can draw now (a backend may draw in battle only, or lose its page)."""
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

    def listen_press(self, on_press):
        """Call `on_press(alias)` when the player clicks a button panel (only a backend that draws buttons)."""

    def draws_buttons(self):
        return False

    def renders_widgets(self):
        """Whether it draws the structured widget payloads now (only the Gameface page, once it answered)."""
        return False

    def drawn_aliases(self):
        """The labels the renderer confirmed on the screen (laid out with a size), or None while it confirmed nothing
        (only the Gameface page reports them). A panel replaces a stock element only while it is in there."""

    def listen_drawn(self, on_drawn):
        """Call `on_drawn()` when `drawn_aliases()` changed."""

    def set_modifier(self, mode):
        """The key the player holds to move and resize panels (`core.hud.modifier` modes)."""


class NullBackend(HudBackend):
    """No renderer installed: every panel stays hidden, features fall back to notifications."""


# The installed renderers in preference order. A label goes to the first one available when it is created and stays
# there until deleted, so a renderer that appears or drops out later never splits a panel between two of them.
class BackendChain(HudBackend):

    def __init__(self, backends):
        self.backends = list(backends)
        self.owners = {}

    @property
    def name(self):
        active = self.active()
        return active.name if active is not None else NullBackend.name

    @property
    def names(self):
        return [backend.name for backend in self.backends]

    def active(self):
        for backend in self.backends:
            if backend.available():
                return backend
        return None

    def available(self):
        return self.active() is not None

    def create(self, alias, props):
        backend = self.active()
        if backend is None or not backend.create(alias, props):
            return False
        self.owners[alias] = backend
        return True

    def update(self, alias, props):
        backend = self.owners.get(alias)
        return bool(backend is not None and backend.update(alias, props))

    def delete(self, alias):
        backend = self.owners.pop(alias, None)
        return bool(backend is not None and backend.delete(alias))

    def listen(self, on_moved):
        for backend in self.backends:
            backend.listen(on_moved)

    def listen_press(self, on_press):
        for backend in self.backends:
            backend.listen_press(on_press)

    def draws_buttons(self):
        active = self.active()
        return active is not None and active.draws_buttons()

    def renders_widgets(self):
        active = self.active()
        return active is not None and active.renders_widgets()

    def drawn_aliases(self):
        active = self.active()
        return active.drawn_aliases() if active is not None else None

    def listen_drawn(self, on_drawn):
        for backend in self.backends:
            backend.listen_drawn(on_drawn)

    def set_modifier(self, mode):
        for backend in self.backends:
            backend.set_modifier(mode)
