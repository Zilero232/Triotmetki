from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: settings_constants names, all vanilla options of the game's settings window.
TRANSPARENCY = 'minimapAlpha'
# RU 1.45 battle/classic/minimap.py __updateAlpha: minimapAlpha counts only while this switch is on.
TRANSPARENCY_ENABLED = 'minimapAlphaEnabled'
VEHICLE_NAMES = 'showVehModelsOnMap'
VIEW_RANGE = 'minimapViewRange'
MAX_VIEW_RANGE = 'minimapMaxViewRange'
DRAW_RANGE = 'minimapDrawRange'
# RU 1.45 client source: AccountSettings MINIMAP_SIZE, index 0..5, not a settings-core option.
SIZE = 'minimapSize'

# MinimapVehModelsSetting.VEHICLE_MODELS_TYPES indices (never 0, alt 1, always 2).
VEHICLE_NAME_MODES = {'alt': 1, 'always': 2}
VEHICLE_NAMES_NEVER = 0

ONCE = {
    'revision': 2,
    'key': 'vehicle_names',
    'value': 'always',
    'off': VEHICLE_NAMES_NEVER,
    'log': 'minimap: the game hid last-seen spots and names (never); switched to always once',
}

EDITOR_GROUPS = (
    ('map', ('size', 'transparency', 'vehicle_names')),
    ('circles', ('view_range', 'max_view_range', 'draw_range')),
)
SCHEMATIC = 'minimap'
