from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import is_finite_number, is_number, string_types, to_text
from ...core.format import strip_tags
from ...core.hud import EVENT_DESCRIBE, EVENT_EDIT
from ..components import PANEL_POSITION_KEYS
from .constants import (
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    MAX_SIZE,
    NO_DESCRIPTION,
    POSITION_ALIGNS,
    POSITION_NUMBERS,
    PREVIEW_MAX_CHARS,
)


def _size(value, default):
    if is_number(value) and 0 < value <= MAX_SIZE:
        return int(value)
    return default


def plain_preview(text):
    if not isinstance(text, string_types):
        return None
    return strip_tags(text).replace('&nbsp;', ' ')[:PREVIEW_MAX_CHARS]


def move_values(message):
    values = {}
    for key in POSITION_NUMBERS:
        value = message.get(key)
        if is_finite_number(value):
            values[key] = int(round(value))
    for key in POSITION_ALIGNS:
        value = message.get(key)
        if isinstance(value, string_types):
            values[key] = to_text(value)
    return values


class HudEditor(object):

    def __init__(self, bus, layer=None):
        self.bus = bus
        self.layer = layer
        self.editing = False

    def panel_ids(self):
        return sorted(getattr(self.layer, 'panels', {})) if self.layer is not None else []

    def descriptions(self):
        found = {}

        def collect(panel_id, preview=None, width=None, height=None, enabled=False, widget=None):
            found[panel_id] = {
                'preview': plain_preview(preview),
                'text': preview if isinstance(preview, string_types) else None,
                'widget': widget if isinstance(widget, dict) else None,
                'width': _size(width, DEFAULT_WIDTH),
                'height': _size(height, DEFAULT_HEIGHT),
                'enabled': bool(enabled),
            }

        self.bus.emit(EVENT_DESCRIBE, collect)
        return found

    def panels(self, labels):
        descriptions = self.descriptions()
        described = []
        for panel_id in self.panel_ids():
            settings = self.layer.panels[panel_id]
            extra = descriptions.get(panel_id) or NO_DESCRIPTION
            item = {'id': panel_id, 'title': labels.title(panel_id)}
            for key in POSITION_NUMBERS + POSITION_ALIGNS:
                item[key] = settings.get(key)
            item.update(extra)
            described.append(item)
        return described

    def move(self, panel_id, values):
        if panel_id not in self.panel_ids() or not values:
            return []
        return self.layer.update_settings(panel_id, values)

    def reset(self, panel_id):
        if panel_id not in self.panel_ids():
            return []
        defaults = self.layer.panels[panel_id].schema.defaults
        position = {key: defaults[key] for key in PANEL_POSITION_KEYS if key in defaults}
        return self.layer.update_settings(panel_id, position)

    def set_editing(self, active):
        active = bool(active)
        if active == self.editing:
            return False
        self.editing = active
        self.bus.emit(EVENT_EDIT, active)
        return True
