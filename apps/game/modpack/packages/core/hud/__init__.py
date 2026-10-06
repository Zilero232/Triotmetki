"""The battle HUD layer: draggable text panels whose position and look persist, behind a backend adapter.

Pure (Python 2/3, no client imports); one concern per subpackage:

- `panel`: the per-panel settings schema (common layout keys + the panel's own) and renderer props;
- `config`: components.json, one schema-checked section per component;
- `backend`: the renderer interface (`HudBackend`), `NullBackend` and `BackendChain` (the runtime choice);
- `layer`: `HudLayer`, what features call (`register`, `show`, `hide`, `update_settings`);
- `label`: `HangarLabel`, one hangar label of a feature on `app.ui` (redrawn only when its text changed);
- `edit`: `HudPreview`, a panel's side of the HUD edit protocol (`hud_edit`, `hud_describe`, `hud_reset_layout`
  on the bus);
- `modes`: battle types (random, comp7, frontline, event, battle_royale), their panel sets and per-type places;
- `modifier`: the key the player holds to move and resize panels (Alt by default);
- `surface`: `HudSurface`, the labels as the Gameface HUD page's state and its messages back.

Panel text templates are `core/templates`.

The client side (the Gameface and GUIFlash backends, the shared layer instance) is `core/client/hud/`.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from .backend import BackendChain, HudBackend, NullBackend
from .config import ComponentConfig
from .edit import EVENT_DESCRIBE, EVENT_EDIT, EVENT_RESET_LAYOUT, HudPreview
from .label import HangarLabel
from .layer import HudLayer
from .surface import HudSurface
from .panel import (
    CARD_FIXED,
    PANEL_DEFAULTS,
    alias_of,
    component_schema,
    hex_color,
    layout_props,
    matching,
    max_length,
    panel_schema,
)

__all__ = (
    'BackendChain',
    'CARD_FIXED',
    'ComponentConfig',
    'EVENT_DESCRIBE',
    'EVENT_EDIT',
    'EVENT_RESET_LAYOUT',
    'HangarLabel',
    'HudBackend',
    'HudLayer',
    'HudPreview',
    'HudSurface',
    'NullBackend',
    'PANEL_DEFAULTS',
    'alias_of',
    'component_schema',
    'hex_color',
    'layout_props',
    'matching',
    'max_length',
    'panel_schema',
)
