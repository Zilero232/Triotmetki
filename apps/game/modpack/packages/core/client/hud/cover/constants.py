from __future__ import absolute_import, division, print_function, unicode_literals

# Context keys of the stock GUI events (RU 1.45 client source: SharedPage._toggleGuiVisible fires GUI_VISIBILITY with
# `visible`; app_factory._toggleBattleLoading fires BATTLE_LOADING with `isShown`).
GUI_VISIBLE = 'visible'
LOADING_SHOWN = 'isShown'
# GameEvent names (gui/shared/events.py, RU 1.45) that open or close a battle page overlay: the page shows it through
# `_setComponentsVisibility`, which the watch follows; each one also has the watch check the page again a frame later.
# FULL_STATS is Tab, FULL_STATS_QUEST_PROGRESS the personal missions key, FULL_STATS_PERSONAL_RESERVES the reserves key
# (ClassicPage._handleToggleFullStats*: the full stats on their tab), EVENT_STATS the event modes' Tab.
OVERLAY_EVENTS = ('FULL_STATS', 'FULL_STATS_QUEST_PROGRESS', 'FULL_STATS_PERSONAL_RESERVES', 'EVENT_STATS')
# frameworks/wulf/gui_constants.WindowStatus names of a window that is on its way out.
GONE_STATUSES = ('DESTROYING', 'DESTROYED')
# PrebattleAmmunitionPanelViewMeta (gui/Scaleform/daapi/view/meta, RU 1.45): the pre-battle setups panel opens and
# closes in the consumables panel's place. (method, shown).
SETUPS_METHODS = (('as_showS', True), ('as_hideS', False))
