from __future__ import absolute_import, division, print_function, unicode_literals

from ..edit import EVENT_RESET_LAYOUT
from ..panel import moved_values
from .constants import PLACE_KEYS, PLACES_ATTR, PLACES_STATE_KEY


def _saved_places(state):
    saved = state.get(PLACES_STATE_KEY) if isinstance(state, dict) else None
    if not isinstance(saved, dict):
        return {}
    return {alias: dict(place) for alias, place in saved.items() if isinstance(place, dict)}


def hangar_places(app):
    places = getattr(app, PLACES_ATTR, None)
    if places is not None:
        return places
    places = _saved_places(getattr(app, 'state', None))
    setattr(app, PLACES_ATTR, places)

    register = getattr(app, 'register_state', None)
    if register is not None:
        register(PLACES_STATE_KEY, lambda: dict(places))
    return places


def _props_of(values):
    props = {}
    for key, prop in PLACE_KEYS:
        if key in values:
            props[prop] = values[key] if key != 'scale' else round(values[key] / 100.0, 2)
    return props


class HangarLabel(object):
    """One hangar label of a feature on `app.ui`: drawn again only when its text or widget changed, taken off when it
    has neither. `text` is what is on the screen (None when nothing is). A feature that keeps no place of its own
    (`on_moved` None) gets the player's drag remembered here, and `hud_reset_layout` puts it back at its default."""

    def __init__(self, app, alias):
        self.app = app
        self.alias = alias
        self.text = None
        self.widget = None
        self.layout = None
        self.own_place = False
        bus = getattr(app, 'bus', None)
        if bus is not None:
            bus.on(EVENT_RESET_LAYOUT, self.reset_place)

    def hide(self):
        """Take the label off; the next `show` draws it again even with the same text."""
        self.text = None
        self.widget = None
        self.app.ui.hide(self.alias)

    def clear(self):
        """Take the label off if it is on the screen."""
        if self.text is not None:
            self.hide()

    def placed(self, layout):
        """`layout` with the player's saved place over it (labels without a place of their own)."""
        place = hangar_places(self.app).get(self.alias) if not self.own_place else None
        if not place:
            return layout
        merged = dict(layout)
        merged.update(_props_of(place))
        return merged

    def show(self, text, layout, on_moved=None, widget=None):
        """Draw `text` (and `widget`, the Gameface page's payload) at `layout`; neither takes the label off."""
        if text is None and widget is None:
            self.clear()
            return
        text = text or u''
        self.own_place = on_moved is not None
        self.layout = layout
        if text == self.text and widget == self.widget:
            return
        if self.app.ui.show(self.alias, text, self.placed(layout), on_moved or self.save_place, widget=widget):
            self.text = text
            self.widget = widget

    def save_place(self, props):
        places = hangar_places(self.app)
        place = dict(places.get(self.alias) or {})
        place.update(moved_values(props))
        places[self.alias] = place
        self._save_state()

    def reset_place(self):
        if hangar_places(self.app).pop(self.alias, None) is None:
            return
        self._save_state()
        if self.text is not None and self.layout is not None:
            self.app.ui.place(self.alias, self.layout)

    def _save_state(self):
        save = getattr(self.app, 'save_state', None)
        if save is not None:
            save()
