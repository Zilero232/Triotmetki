from __future__ import absolute_import, division, print_function, unicode_literals

# GameEvent.SHOW_EXTENDED_INFO (battle_control/event_dispatcher.showExtendedInfo, RU 1.45): Alt down or up.
EXTENDED_INFO_DOWN = 'isDown'
# The app bus event our panels with an alternate (Alt) mode follow: `held` is True while Alt is down.
EXTENDED_INFO_EVENT = 'battle_extended_info'
# BATTLE_VIEW_ALIASES.CONSUMABLES_PANEL (RU 1.45 client source): the stock consumables panel in `page.components`.
CONSUMABLES_PANEL = 'consumablesPanel'
# ConsumablesPanel (gui/Scaleform/daapi/view/battle/shared/consumables_panel.py, RU 1.45): the methods that add or drop
# slots (each sets `_mask` first), after which the panel's width is measured again.
BAR_METHODS = ('_addShellSlot', '_addEquipmentSlot', '_addOptionalDeviceSlot', '_reset', '_resetOptDevices')
# AccountSettings.MINIMAP_SIZE (account_helpers/AccountSettings.py, RU 1.45): the minimap size index the battle reads.
MINIMAP_SIZE_SETTING = 'minimapSize'
