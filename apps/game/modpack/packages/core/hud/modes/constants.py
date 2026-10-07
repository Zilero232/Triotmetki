from __future__ import absolute_import, division, print_function, unicode_literals

MODE_RANDOM = 'random'
MODE_COMP7 = 'comp7'
MODE_FRONTLINE = 'frontline'
MODE_EVENT = 'event'
MODE_BATTLE_ROYALE = 'battle_royale'
MODES = (MODE_RANDOM, MODE_COMP7, MODE_FRONTLINE, MODE_EVENT, MODE_BATTLE_ROYALE)

# RU 1.45 client source: common/constants.py ARENA_GUI_TYPE plus the extensions' own ids.
GUI_TYPE_MODES = {
    1: MODE_RANDOM,
    2: MODE_RANDOM,
    5: MODE_RANDOM,
    15: MODE_RANDOM,
    16: MODE_RANDOM,
    17: MODE_RANDOM,
    18: MODE_RANDOM,
    19: MODE_RANDOM,
    20: MODE_RANDOM,
    24: MODE_RANDOM,
    31000: MODE_RANDOM,
    30: MODE_COMP7,
    33: MODE_COMP7,
    21: MODE_FRONTLINE,
    22: MODE_FRONTLINE,
    23: MODE_BATTLE_ROYALE,
    6: MODE_EVENT,
    7: MODE_EVENT,
    13: MODE_EVENT,
    14: MODE_EVENT,
    25: MODE_EVENT,
    26: MODE_EVENT,
    27: MODE_EVENT,
    28: MODE_EVENT,
    29: MODE_EVENT,
    100: MODE_EVENT,
    300: MODE_EVENT,
    301: MODE_EVENT,
}
# The client's extensions number their own gui types from 100.
EXTENSION_GUI_TYPES_FROM = 100

# RU 1.45 common/constants.py ARENA_BONUS_TYPE (and the extensions'), read when the arena has no gui type.
BONUS_TYPE_MODES = {
    43: MODE_COMP7,
    47: MODE_COMP7,
    27: MODE_FRONTLINE,
    28: MODE_FRONTLINE,
    29: MODE_BATTLE_ROYALE,
    30: MODE_BATTLE_ROYALE,
    34: MODE_BATTLE_ROYALE,
    35: MODE_BATTLE_ROYALE,
    9: MODE_EVENT,
    26: MODE_EVENT,
    31: MODE_EVENT,
    32: MODE_EVENT,
    33: MODE_EVENT,
    36: MODE_EVENT,
    39: MODE_EVENT,
    40: MODE_EVENT,
    41: MODE_EVENT,
    42: MODE_EVENT,
    51: MODE_EVENT,
    52: MODE_EVENT,
    53: MODE_EVENT,
    100: MODE_EVENT,
}

# RU 1.45 gui/Scaleform/daapi/settings/views.py VIEW_ALIAS of the battle pages.
PAGE_MODES = {
    'classicBattlePage': MODE_RANDOM,
    'epicRandomPage': MODE_RANDOM,
    'strongholdBattlePage': MODE_RANDOM,
    'rankedBattlePage': MODE_RANDOM,
    'comp7BattlePage': MODE_COMP7,
    'epicBattlePage': MODE_FRONTLINE,
    'battleRoyalePage': MODE_BATTLE_ROYALE,
    'eventBattlePage': MODE_EVENT,
    'cosmicBattlePage': MODE_EVENT,
    'mapsTrainingBattlePage': MODE_EVENT,
    'StoryModeBattlePage': MODE_EVENT,
}

LAYOUT_FULL = 'full'
LAYOUT_COMPACT = 'compact'
LAYOUT_OFF = 'off'
LAYOUTS = (LAYOUT_FULL, LAYOUT_COMPACT, LAYOUT_OFF)
COMPACT_PANELS = ('marks_panel', 'damage_log')

PLACES_SECTION = 'hud_layout_places'
PLACE_NUMBERS = ('x', 'y', 'scale')
PLACE_ALIGNS = (('align_x', ('left', 'center', 'right')), ('align_y', ('top', 'center', 'bottom')))
