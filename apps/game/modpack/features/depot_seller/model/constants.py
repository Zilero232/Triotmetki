from __future__ import absolute_import, division, print_function, unicode_literals

KIND_SHELLS = 'shells'
KIND_MODULES = 'modules'
KIND_EQUIPMENT = 'equipment'
KIND_CONSUMABLES = 'consumables'
# The settings switch of each kind of depot item, in the order the page lists them.
KIND_SWITCHES = (
    (KIND_SHELLS, 'sell_shells'),
    (KIND_MODULES, 'sell_modules'),
    (KIND_EQUIPMENT, 'sell_equipment'),
    (KIND_CONSUMABLES, 'sell_consumables'),
)
CREW_SWITCH = 'dismiss_crew'

ACTION_SELL = 'sell'
ACTION_REFRESH = 'refresh'
# The sell action's id is `sell:<token>` of the sale its confirmation listed (model sale_token).
SALE_TOKEN_SEPARATOR = ':'
SALE_TOKEN_LENGTH = 16

REFUSE_UNSET = 'unset'
REFUSE_NOTHING = 'nothing'
REFUSE_CHANGED = 'changed'

MAX_NAME = 60
# The confirmation lists this many items by name, then "and N more": the page lists them all.
CONFIRM_ITEMS = 6
CREW_ROW_PREFIX = 'crew:'
ITEM_ROW_PREFIX = 'item:'
