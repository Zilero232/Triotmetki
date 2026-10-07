from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: SharedPage._toggleGuiVisible and app_factory._toggleBattleLoading.
GUI_VISIBLE = 'visible'
LOADING_SHOWN = 'isShown'
# RU 1.45 gui/shared/events.py GameEvent names that open or close a battle page overlay.
OVERLAY_EVENTS = ('FULL_STATS', 'FULL_STATS_QUEST_PROGRESS', 'FULL_STATS_PERSONAL_RESERVES', 'EVENT_STATS')
# frameworks/wulf/gui_constants.WindowStatus names of a window on its way out.
GONE_STATUSES = ('DESTROYING', 'DESTROYED')
# RU 1.45 gui/Scaleform/daapi/view/meta PrebattleAmmunitionPanelViewMeta.
SETUPS_METHODS = (('as_showS', True), ('as_hideS', False))
