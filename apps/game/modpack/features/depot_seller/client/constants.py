from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: gui.shared.gui_items.GUI_ITEM_TYPE names and the depot kind each one is sold under.
MODULE_TYPES = ('CHASSIS', 'TURRET', 'GUN', 'ENGINE', 'RADIO')
KIND_TYPES = (
    ('shells', ('SHELL',)),
    ('modules', MODULE_TYPES),
    ('equipment', ('OPTIONALDEVICE',)),
    ('consumables', ('EQUIPMENT',)),
)
# artefacts.OptionalDevice (RU 1.45): the devices the depot keeps apart from the regular ones.
SPECIAL_DEVICE_FLAGS = ('isDeluxe', 'isTrophy', 'isModernized')
# RU 1.45 client source: items.special_crew, the checks of the crews bound to a bundle or an event.
SPECIAL_CREW_CHECKS = ('isSabatonCrew', 'isOffspringCrew', 'isWitchesCrew', 'isYhaCrew')
