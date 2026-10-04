from __future__ import absolute_import, division, print_function, unicode_literals

BAR_CHAR = '|'
# The styles with one bar per vehicle, in the stock strip's order (same data as the totals).
STRIP_STYLES = ('icons', 'segments')
COMPACT_STYLES = ('compact', 'minimal')
# What the text line of each bar pair style draws on both sides of the score (compact also stands for minimal).
PAIR_PARTS = {
    'full': {'bars': True, 'numbers': True},
    'bars': {'bars': True, 'numbers': False},
    'numbers': {'bars': False, 'numbers': True},
    'compact': {'bars': False, 'numbers': True},
}
SIDE_COLORS = {'allies': 'ally_color', 'enemies': 'enemy_color'}
# The HUD tones the page paints each side in (docs/specs/2026-09-30-hud-consolidation-and-design.md section 6.4); a
# colour the player set other than the default (`ally_color`, `enemy_color`) overrides its tone.
SIDE_TONES = {'ally': 'ally', 'enemy': 'enemy'}
SIDE_COLOR_KEYS = (('ally', 'ally_color'), ('enemy', 'enemy_color'))
# The class icon tint of each side, keyed by whether it is the allies, as on the stock strip.
SIDE_TINTS = {True: 'green', False: 'red'}
# The difference line under the bars: this much smaller than the bars, never below the smallest readable size.
DIFF_FONT_DECREASE = 2
MIN_DIFF_FONT_SIZE = 8

# The score pair: frags, or the vehicles still alive with the `show_alive` setting.
SCORE_KEYS = {
    False: ('allies_frags', 'enemies_frags'),
    True: ('allies_alive', 'enemies_alive'),
}

# The game's own score strip options our strip follows (RU 1.45 settings_constants.py GAME.SHOW_VEHICLES_COUNTER, the
# vehicle icons; ScorePanelStorageKeys.ENABLE_TIER_GROUPING; both on by default, SettingsCore.py / AccountSettings.py).
SHOW_VEHICLES_COUNTER = 'showVehiclesCounter'
ENABLE_TIER_GROUPING = 'enableTierGrouping'
STOCK_STRIP_SETTINGS = (SHOW_VEHICLES_COUNTER, ENABLE_TIER_GROUPING)
# The stock strip's tier labels (gui_battle TierGroupingElement.as).
TIER_NUMERALS = ('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI')

PREVIEW_TEAM = 1
# (vehicle id, team, max HP, HP, alive, class, tier)
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

# The settings window's editor: the look of the strip, then what the score shows.
EDITOR_GROUPS = (
    ('look', ('style',)),
    ('score', ('show_score', 'show_alive', 'show_diff')),
)
