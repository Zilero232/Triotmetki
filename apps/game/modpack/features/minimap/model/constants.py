from __future__ import absolute_import, division, print_function, unicode_literals

# Settings-core names (account_helpers.settings_core.settings_constants, RU 1.45 client source); an
# unknown name is never written. Every one of them is a vanilla option of the game's own settings window
# (Battle / Minimap), so nothing here shows what the client does not.
TRANSPARENCY = 'minimapAlpha'
# RU 1.45 gui/Scaleform/daapi/view/battle/classic/minimap.py __updateAlpha: minimapAlpha counts only while this switch
# (off by default) is on, as the settings window's transparency checkbox writes it.
TRANSPARENCY_ENABLED = 'minimapAlphaEnabled'
VEHICLE_NAMES = 'showVehModelsOnMap'
VIEW_RANGE = 'minimapViewRange'
MAX_VIEW_RANGE = 'minimapMaxViewRange'
DRAW_RANGE = 'minimapDrawRange'
# Not a settings-core option: RU 1.45 client source keeps the size in AccountSettings (MINIMAP_SIZE,
# account_helpers/AccountSettings.py), index 0..5 clamped by the battle minimap
# (gui/Scaleform/daapi/view/battle/shared/minimap/settings.py), the value its own +/- keys change.
SIZE = 'minimapSize'

VEHICLE_NAME_MODES = {'never': 0, 'alt': 1, 'always': 2}

# The settings window's editor (docs/specs/2026-09-30-hud-consolidation-and-design.md section 12.3): its field groups
# around a schematic minimap the window draws from the field values.
EDITOR_GROUPS = (
    ('map', ('size', 'transparency', 'vehicle_names')),
    ('circles', ('view_range', 'max_view_range', 'draw_range')),
)
SCHEMATIC = 'minimap'
