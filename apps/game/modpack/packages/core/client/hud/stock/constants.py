from __future__ import absolute_import, division, print_function, unicode_literals

# ConsumablesPanel (gui/Scaleform/daapi/view/battle/shared/consumables_panel.py, RU 1.45): the methods that add or drop
# slots (each sets `_mask` first), after which the panel's width is measured again.
BAR_METHODS = ('_addShellSlot', '_addEquipmentSlot', '_addOptionalDeviceSlot', '_reset', '_resetOptDevices')
# AccountSettings.MINIMAP_SIZE (account_helpers/AccountSettings.py, RU 1.45): the minimap size index the battle reads.
MINIMAP_SIZE_SETTING = 'minimapSize'
# MinimapComponent.applyNewSize(sizeIndex) (gui/Scaleform/daapi/view/battle/shared/minimap/component.py, RU 1.45): the
# minimap resized in battle (the size keys), with the new index of MINIMAP_SIZES.
MINIMAP_RESIZE_METHOD = 'applyNewSize'
