from __future__ import absolute_import, division, print_function, unicode_literals

KIND_SHELLS = 'shells'
KIND_MODULES = 'modules'
KIND_EQUIPMENT = 'equipment'
KIND_CONSUMABLES = 'consumables'
KIND_SWITCHES = (
    (KIND_SHELLS, 'sell_shells'),
    (KIND_MODULES, 'sell_modules'),
    (KIND_EQUIPMENT, 'sell_equipment'),
    (KIND_CONSUMABLES, 'sell_consumables'),
)
CREW_SWITCH = 'dismiss_crew'

ACTION_SELL = 'sell'
SALE_TOKEN_SEPARATOR = ':'
SALE_TOKEN_LENGTH = 16

REFUSE_UNSET = 'unset'
REFUSE_NOTHING = 'nothing'
REFUSE_CHANGED = 'changed'

MAX_NAME = 60
# RU 1.45 client source: MAX_ROLE_LEVEL of gui.shared.gui_items.Tankman, the full role level.
MAX_ROLE_LEVEL = 100
# A missing flag counts as set: a tankman the read could not check is never dismissed.
PROTECTED_CREW_FLAGS = ('premium', 'female', 'unique', 'special', 'locked')
CONFIRM_ITEMS = 6
CREW_ROW_PREFIX = 'crew:'
ITEM_ROW_PREFIX = 'item:'
