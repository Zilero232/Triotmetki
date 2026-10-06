from __future__ import absolute_import, division, print_function, unicode_literals

from ...hud.panel import dock_of, panel_hint
from ...log import log, safe
from ..hud import create_backend
from ..lobby_view import lobby_view


class Ui(object):
    """Hangar panels and notifications for the companion and the hangar features: labels drawn by the HUD renderer
    (the OpenWG Gameface HUD page), each placed by its own layout, and the game's system messages.
    `set_muted` and `set_blocked` (the streamer mode) take labels off the screen and bring them back later.
    Labels show only over the plain hangar view (`core.lobby_view`): the battle queue, another
    lobby view, the settings window or a full-screen window hides them (`set_context`), and they come back after.
    A label is framed only while the player holds the edit modifier; `on_moved(props)` gets the new place
    (x, y, alignX, alignY or scale) after the player moved or resized it. A label may carry a structured `widget`
    (`core.hud.widget`) the Gameface page draws instead of its text; a label at its column's anchor is docked
    (`core.hud.panel.dock_of`). With the app's `translate` every label carries its component's short description, the
    tooltip the Gameface page shows over it (`core.hud.panel.panel_hint`)."""

    def __init__(self, backend=None, watch=None, translate=None):
        self.backend = backend or create_backend()
        self.watch = watch
        self.translate = translate
        self.watching = False
        self.components = set()
        self.moved = {}
        self.texts = {}
        self.muted = False
        self.in_view = True
        self.blocked = frozenset()
        self.held = {}
        if not self.has_panels:
            log('no hangar HUD renderer: panels fall back to system messages')
        self.backend.listen(self._on_moved)

    @property
    def has_panels(self):
        return bool(self.backend.available())

    def suppressed(self, alias):
        return self.muted or alias in self.blocked

    def _follow_view(self):
        if self.watching:
            return
        self.watching = True
        (self.watch or lobby_view()).listen(self.set_context)

    @safe
    def show(self, alias, text, layout, on_moved=None, widget=None):
        if not self.has_panels:
            return False
        self._follow_view()
        if self.suppressed(alias):
            self._take_off(alias)
            self.held[alias] = (text, layout, widget)
            return True

        self.held.pop(alias, None)
        self.texts[alias] = (text, layout, widget)
        if on_moved is not None:
            self.moved[alias] = on_moved
        return self._draw(alias, layout, text, widget)

    def _draw(self, alias, layout, text, widget):
        content = {
            'text': text,
            'widget': widget,
            'visible': self.in_view,
            'dock': dock_of(alias, layout),
            'hint': panel_hint(self.translate, alias),
        }
        if alias in self.components:
            self.backend.update(alias, content)
            return True

        props = {'border': False}
        props.update(layout)
        props.update(content)
        props['drag'] = True
        if not self.backend.create(alias, props):
            self.texts.pop(alias, None)
            return False
        self.components.add(alias)
        return True

    def place(self, alias, layout):
        """Move a shown label to a new layout (a reset)."""
        if alias in self.components:
            props = dict(layout)
            props['dock'] = dock_of(alias, layout)
            self.backend.update(alias, props)

    def set_modifier(self, mode):
        self.backend.set_modifier(mode)

    @safe
    def set_context(self, visible):
        """Show the labels (True: the plain hangar view) or hide them without forgetting them (False)."""
        visible = bool(visible)
        if visible == self.in_view:
            return
        self.in_view = visible
        for alias in list(self.components):
            self.backend.update(alias, {'visible': visible})

    def _on_moved(self, alias, props):
        callback = self.moved.get(alias)
        if callback is None:
            return False
        callback(props)
        if alias in self.components and ('x' in props or 'y' in props):
            self.backend.update(alias, {'dock': None})
        return True

    @safe
    def hide(self, alias):
        self.held.pop(alias, None)
        self._take_off(alias)

    def _take_off(self, alias):
        self.texts.pop(alias, None)
        if alias not in self.components:
            return
        self.backend.delete(alias)
        self.components.discard(alias)

    @safe
    def set_muted(self, muted):
        self.muted = bool(muted)
        self._apply()

    @safe
    def set_blocked(self, aliases):
        self.blocked = frozenset(aliases or ())
        self._apply()

    def _apply(self):
        for alias in list(self.components):
            if self.suppressed(alias):
                self._hold(alias)
        for alias, (text, layout, widget) in list(self.held.items()):
            if not self.suppressed(alias):
                self.show(alias, text, layout, widget=widget)

    def _hold(self, alias):
        if alias in self.texts:
            self.held[alias] = self.texts[alias]
        self._take_off(alias)

    @safe
    def notify(self, text):
        from gui import SystemMessages
        SystemMessages.pushMessage(text, type=SystemMessages.SM_TYPE.Information)
