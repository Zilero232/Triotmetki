from __future__ import absolute_import, division, print_function, unicode_literals

BAR_CHAR = '|'
STRIP_STYLES = ('icons', 'segments')
COMPACT_STYLES = ('compact', 'minimal')
PAIR_PARTS = {
    'full': {'bars': True, 'numbers': True},
    'bars': {'bars': True, 'numbers': False},
    'numbers': {'bars': False, 'numbers': True},
    'compact': {'bars': False, 'numbers': True},
}
SIDE_COLORS = {'allies': 'ally_color', 'enemies': 'enemy_color'}
SIDE_TONES = {'ally': 'ally', 'enemy': 'enemy'}
SIDE_COLOR_KEYS = (('ally', 'ally_color'), ('enemy', 'enemy_color'))
SIDE_TINTS = {True: 'green', False: 'red'}
DIFF_FONT_DECREASE = 2
MIN_DIFF_FONT_SIZE = 8

SCORE_KEYS = {
    False: ('allies_frags', 'enemies_frags'),
    True: ('allies_alive', 'enemies_alive'),
}

# RU 1.45 settings_constants.py GAME.SHOW_VEHICLES_COUNTER, ScorePanelStorageKeys.ENABLE_TIER_GROUPING.
SHOW_VEHICLES_COUNTER = 'showVehiclesCounter'
ENABLE_TIER_GROUPING = 'enableTierGrouping'
STOCK_STRIP_SETTINGS = (SHOW_VEHICLES_COUNTER, ENABLE_TIER_GROUPING)
# The stock strip's tier labels (gui_battle TierGroupingElement.as).
TIER_NUMERALS = ('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI')

PREVIEW_TEAM = 1
PREVIEW_VEHICLES = (
    (1, 1, 1800, 1200, True, 'mediumTank', 9),
    (2, 1, 1500, 0, False, 'lightTank', 8),
    (3, 1, 2000, 2000, True, 'heavyTank', 10),
    (4, 2, 1700, 900, True, 'AT-SPG', 9),
    (5, 2, 1600, 0, False, 'mediumTank', 10),
    (6, 2, 1900, 0, False, 'SPG', 8),
)
PREVIEW_SIZE = (300, 60)

KIND = 'team_hp'

EDITOR_GROUPS = (
    ('look', ('style',)),
    ('score', ('show_score', 'show_alive', 'show_diff')),
)
