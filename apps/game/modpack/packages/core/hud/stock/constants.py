from __future__ import absolute_import, division, print_function, unicode_literals

# BATTLE_VIEW_ALIASES (gui/Scaleform/genConsts/BATTLE_VIEW_ALIASES.py, RU 1.45 client source) our panels may replace.
FRAG_CORRELATION_BAR = 'fragCorrelationBar'
BATTLE_DAMAGE_LOG_PANEL = 'battleDamageLogPanel'
SIXTH_SENSE = 'sixthSense'
BATTLE_TIMER = 'battleTimer'
STOCK_ALIASES = (FRAG_CORRELATION_BAR, BATTLE_DAMAGE_LOG_PANEL, SIXTH_SENSE, BATTLE_TIMER)

# RU 1.45 client source: plugins._makeSettingsVO -> CrosshairPanelContainer.setSettings.
RETICLE_RELOAD_TIMER = 'reloaderTimerAlphaValue'
RETICLE_RELOAD = 'reloaderAlphaValue'
RETICLE_CONDITION = 'conditionAlphaValue'
RETICLE_CASSETTE = 'cassetteAlphaValue'
RETICLE_ZOOM = 'zoomIndicatorAlphaValue'
RETICLE_PARTS = (RETICLE_RELOAD_TIMER, RETICLE_RELOAD, RETICLE_CONDITION, RETICLE_CASSETTE, RETICLE_ZOOM)
HIDDEN_ALPHA = 0.0
# RU 1.45 client source: CrosshairPanelContainerMeta autoloader reload calls.
AUTOLOADER_UPDATE_TIMER = ('isTimerOn', 4)
AUTOLOADER_PERCENT_TIMER = ('isTimerOn', 2)

# RU 1.45 gui_battle AS3: MinimapSizeConst.MAP_SIZE and ConsumablesPanel sizes.
MINIMAP_SIZES = (210, 260, 310, 390, 490, 610)
MINIMAP_FALLBACK = 310
BAR_PITCH = 57
BAR_FALLBACK_SLOTS = 7

CONSUMABLES_PANEL = 'consumablesPanel'
MINIMAP = 'minimap'
FOLLOWED_METRICS = ((CONSUMABLES_PANEL, 'bar'), (MINIMAP, 'minimap'))
FOLLOWED_ALIASES = tuple(alias for alias, _ in FOLLOWED_METRICS)
MISSING_SIZE = 0
