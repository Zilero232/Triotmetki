from __future__ import absolute_import, division, print_function, unicode_literals

from ..layer.constants import COVER_FULL_STATS, COVER_GUI, COVER_LOADING, COVER_SCREEN

SOURCE_GUI = 'gui'
SOURCE_LOADING = 'loading'
SOURCE_PAGE = 'page'
SOURCE_WINDOWS = 'windows'
SOURCES = (SOURCE_GUI, SOURCE_LOADING, SOURCE_PAGE, SOURCE_WINDOWS)
REASONS = (COVER_GUI, COVER_LOADING, COVER_FULL_STATS, COVER_SCREEN)
WINDOW_REASONS = (COVER_FULL_STATS, COVER_SCREEN)
HIDE_UNDER_WINDOWS_KEY = 'hud_hide_under_windows'

# RU 1.45 client source: BATTLE_VIEW_ALIASES, hidden only with the whole HUD under an overlay.
REFERENCE_ALIASES = ('teamBasesPanel', 'debugPanel', 'minimap')
STATS_ALIASES = ('fullStats', 'eventStats')
SCREEN_ALIASES = (
    'epicRespawnView',
    'epicOverviewMapScreen',
    'BRSelectRespawn',
    'battleRoyaleWinnerCongrats',
    'wtHunterRespawn',
)
PAGE_ALIAS_REASONS = (
    (STATS_ALIASES, COVER_FULL_STATS),
    (SCREEN_ALIASES, COVER_SCREEN),
)

# RU 1.45 frameworks/wulf/gui_constants.WindowFlags.
WINDOW_TYPE_MASK = 255
WINDOW_TYPES = (1, 17)
WINDOW_FULLSCREEN = 1024

CHECK_INTERVAL_S = 1.0
