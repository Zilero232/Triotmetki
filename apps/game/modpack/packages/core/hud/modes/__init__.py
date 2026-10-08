"""Battle types and their HUD layout: which panels a type shows and where the player put them in it.

`battle_mode(gui_type, bonus_type, page_alias)` names the battle type of an arena (`random`, `comp7`, `frontline`,
`event`, `battle_royale`); `random` is also the answer for an arena it cannot read. `allowed_panels(layout)` is the
panel set of a layout choice (None: every panel). `ModePlaces` keeps, per battle type other than random, the places the
player dragged the panels to in a battle of that type (components.json `hud_layout_places`); random keeps the panels'
own settings.

Pure (Python 2/3). The client side (reading the arena and the battle page) is `core/client/hud/modes`.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import clamp, is_finite_number, is_int, string_types, to_text
from ..panel.constants import PANEL_LIMITS
from .constants import (
    BONUS_TYPE_MODES,
    COMPACT_PANELS,
    EXTENSION_GUI_TYPES_FROM,
    GUI_TYPE_MODES,
    LAYOUT_COMPACT,
    LAYOUT_FULL,
    LAYOUT_OFF,
    LAYOUTS,
    MODE_BATTLE_ROYALE,
    MODE_COMP7,
    MODE_EVENT,
    MODE_FRONTLINE,
    MODE_RANDOM,
    MODES,
    PAGE_MODES,
    PLACE_ALIGNS,
    PLACE_NUMBERS,
    PLACES_SECTION,
)

__all__ = (
    'COMPACT_PANELS',
    'LAYOUTS',
    'LAYOUT_COMPACT',
    'LAYOUT_FULL',
    'LAYOUT_OFF',
    'MODES',
    'MODE_BATTLE_ROYALE',
    'MODE_COMP7',
    'MODE_EVENT',
    'MODE_FRONTLINE',
    'MODE_RANDOM',
    'ModePlaces',
    'PLACES_SECTION',
    'allowed_panels',
    'battle_mode',
    'clean_place',
    'clean_places',
)


def _known(value):
    return is_int(value) and not isinstance(value, bool)


def battle_mode(gui_type=None, bonus_type=None, page_alias=None):
    if _known(gui_type) and gui_type in GUI_TYPE_MODES:
        return GUI_TYPE_MODES[gui_type]
    if _known(bonus_type) and bonus_type in BONUS_TYPE_MODES:
        return BONUS_TYPE_MODES[bonus_type]
    if _known(gui_type) and gui_type >= EXTENSION_GUI_TYPES_FROM:
        return MODE_EVENT
    if isinstance(page_alias, string_types) and page_alias in PAGE_MODES:
        return PAGE_MODES[page_alias]
    return MODE_RANDOM


def allowed_panels(layout):
    """The panel ids a layout choice shows, or None for all of them."""
    if layout == LAYOUT_COMPACT:
        return frozenset(COMPACT_PANELS)
    if layout == LAYOUT_OFF:
        return frozenset()
    return None


def clean_place(values):
    place = {}
    if not isinstance(values, dict):
        return place
    for key in PLACE_NUMBERS:
        value = values.get(key)
        if is_finite_number(value):
            low, high = PANEL_LIMITS[key]
            place[key] = int(clamp(int(round(value)), low, high))
    for key, choices in PLACE_ALIGNS:
        value = values.get(key)
        if isinstance(value, string_types) and to_text(value) in choices:
            place[key] = to_text(value)
    return place


def clean_places(raw):
    """{battle type: {panel id: clean place}} of a stored or imported `hud_layout_places` section; anything else
    is dropped."""
    places = {}
    if not isinstance(raw, dict):
        return places

    for mode in MODES:
        panels = raw.get(mode)
        if not isinstance(panels, dict):
            continue
        places[mode] = _clean_panels(panels)
    return places


def _clean_panels(panels):
    cleaned = {}
    for panel_id, place in panels.items():
        if isinstance(panel_id, string_types):
            cleaned[to_text(panel_id)] = clean_place(place)
    return cleaned


def _has_places(panels):
    return isinstance(panels, dict) and bool(panels)


class ModePlaces(object):

    def __init__(self, config):
        self.config = config

    def _all(self):
        raw = self.config.raw(PLACES_SECTION)
        return raw if isinstance(raw, dict) else {}

    def get(self, mode, panel_id):
        if mode not in MODES or mode == MODE_RANDOM:
            return {}
        panels = self._all().get(mode)
        return clean_place(panels.get(panel_id)) if isinstance(panels, dict) else {}

    def modes(self):
        return sorted(mode for mode, panels in self._all().items() if mode in MODES and _has_places(panels))

    def save(self, mode, panel_id, values):
        if mode not in MODES or mode == MODE_RANDOM or not isinstance(panel_id, string_types):
            return []
        values = clean_place(values)
        stored = {key: value for key, value in self._all().items() if key in MODES and isinstance(value, dict)}
        panels = dict(stored.get(mode) or {})
        place = clean_place(panels.get(panel_id))
        changed = sorted(key for key, value in values.items() if place.get(key) != value)
        if not changed:
            return []
        place.update(values)
        panels[panel_id] = place
        stored[mode] = panels
        self.config.set_raw(PLACES_SECTION, stored)
        return changed

    def clear(self):
        if not self.modes():
            return False
        self.config.set_raw(PLACES_SECTION, {})
        return True
