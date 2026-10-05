from __future__ import absolute_import, division, print_function, unicode_literals

# BATTLE_VIEW_ALIASES (gui/Scaleform/genConsts/BATTLE_VIEW_ALIASES.py, RU 1.45 client source) our panels may replace.
FRAG_CORRELATION_BAR = 'fragCorrelationBar'
BATTLE_DAMAGE_LOG_PANEL = 'battleDamageLogPanel'
SIXTH_SENSE = 'sixthSense'
BATTLE_TIMER = 'battleTimer'
STOCK_ALIASES = (FRAG_CORRELATION_BAR, BATTLE_DAMAGE_LOG_PANEL, SIXTH_SENSE, BATTLE_TIMER)

# Parts of the stock reticle our crosshair readouts replace: the opacity keys of the crosshair panel's settings, one
# dict per reticle view (plugins._makeSettingsVO -> CrosshairPanelContainer.setSettings, RU 1.45 client source). The
# player's saved settings are never written; the panel gets the opacity 0 for a part only while ours draws it.
RETICLE_RELOAD_TIMER = 'reloaderTimerAlphaValue'
RETICLE_RELOAD = 'reloaderAlphaValue'
RETICLE_CONDITION = 'conditionAlphaValue'
RETICLE_CASSETTE = 'cassetteAlphaValue'
RETICLE_ZOOM = 'zoomIndicatorAlphaValue'
RETICLE_PARTS = (RETICLE_RELOAD_TIMER, RETICLE_RELOAD, RETICLE_CONDITION, RETICLE_CASSETTE, RETICLE_ZOOM)
HIDDEN_ALPHA = 0.0

# The stock battle elements some default places follow, in design px (RU 1.45 gui_battle AS3).
# MinimapSizeConst.MAP_SIZE: the minimap square by the `minimapSize` account setting (index 0-5,
# AccountSettings.MINIMAP_SIZE); the middle size when the setting cannot be read. ConsumablesPanel.drawLayout: one
# ITEM_WIDTH_PADDING (57 px) per slot the panel added (its `_mask` bits, consumables_panel.py), centred at the bottom;
# seven slots (three shells, three consumables and one device) when the panel cannot be read.
MINIMAP_SIZES = (210, 260, 310, 390, 490, 610)
MINIMAP_FALLBACK = 310
BAR_PITCH = 57
BAR_FALLBACK_SLOTS = 7

# The stock components some of our panels sit beside and follow (core.hud.panel ATTACHED, FOLLOWS). The page hides the
# consumables panel on death (SharedPage._switchToPostmortem), in the video camera (ClassicPage._changeCtrlMode) and
# while the pre-battle setups panel takes its place (BattlePage.updateConsumablePanel); it gives it back on a respawn
# (_reloadPostmortem). While one is off the screen the attached panels measure its `stock_metrics` key as 0 px
# (`MISSING_SIZE`).
CONSUMABLES_PANEL = 'consumablesPanel'
MINIMAP = 'minimap'
FOLLOWED_METRICS = ((CONSUMABLES_PANEL, 'bar'), (MINIMAP, 'minimap'))
FOLLOWED_ALIASES = tuple(alias for alias, _ in FOLLOWED_METRICS)
MISSING_SIZE = 0
