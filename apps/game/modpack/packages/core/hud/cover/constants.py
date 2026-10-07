from __future__ import absolute_import, division, print_function, unicode_literals

from ..layer.constants import COVER_FULL_STATS, COVER_GUI, COVER_LOADING, COVER_SCREEN

# The sources `core.client.hud.cover` reads; each one reports the reasons it sees right now and a reason is on while
# any source reports it (docs/research/client/2026-10-05-battle-overlays.md).
SOURCE_GUI = 'gui'
SOURCE_LOADING = 'loading'
SOURCE_PAGE = 'page'
SOURCE_WINDOWS = 'windows'
SOURCES = (SOURCE_GUI, SOURCE_LOADING, SOURCE_PAGE, SOURCE_WINDOWS)
# Every reason the watch drives on the layer, so a reason no source reports any more is switched off.
REASONS = (COVER_GUI, COVER_LOADING, COVER_FULL_STATS, COVER_SCREEN)
# The reasons that are a game window over the battle: the config.json switch HIDE_UNDER_WINDOWS_KEY turns them off.
# V and the loading screen always hide the panels, as they hide the stock HUD.
WINDOW_REASONS = (COVER_FULL_STATS, COVER_SCREEN)
# The companion config.json switch "hide panels under game windows" (on when the key is missing).
HIDE_UNDER_WINDOWS_KEY = 'hud_hide_under_windows'

# The battle page's reference components (BATTLE_VIEW_ALIASES, RU 1.45 client source): no page hides them on their own,
# only together with the whole HUD under an overlay (ClassicPage._toggleFullStats for Tab and the personal missions and
# personal reserves keys, SharedPage._onBattleLoadingStart, EpicBattlePage._invalidateState, the event stats), and we
# never suppress them. XVM mirrors `teamBasesPanel` the same way (UI_teamBasesPanel.as:77-81); the first one the page
# has decides, in this order.
REFERENCE_ALIASES = ('teamBasesPanel', 'debugPanel', 'minimap')
# The page components that cover the battle view while the page shows them, on top of the reference: the full stats on
# any tab and the event stats (EventBattlePage, WhiteTigerBattlePage._toggleEventStats), and the screens that replace
# the battle view: the Frontline respawn and overview map (EpicBattlePage._STATE_TO_UI), the Steel Hunter spawn choice
# and winner screen (BattleRoyalePage), the Waffentrager hunter respawn (white_tiger WHITE_TIGER_BATTLE_VIEW_ALIASES).
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

# frameworks/wulf/gui_constants.WindowFlags (RU 1.45): a Gameface window covers the battle when it is a plain window or
# a dialog (pop-overs, tooltips, context menus, drop-downs, service and waiting windows never do) that is full screen
# (WINDOW_FULLSCREEN). Modal windows and dialogs draw over the HUD window as the Esc menu does; nobody hides for
# them.
WINDOW_TYPE_MASK = 255
WINDOW_TYPES = (1, 17)
WINDOW_FULLSCREEN = 1024

# How often a covered battle checks the client again (seconds): a close event the client never sent cannot keep the
# panels covered for longer.
CHECK_INTERVAL_S = 1.0
