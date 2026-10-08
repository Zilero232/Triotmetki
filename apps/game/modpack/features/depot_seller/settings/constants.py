from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_depot_seller'
SECTION = 'depot_seller'
GROUP = 'hangar'

CATEGORIES = ('sell_shells', 'sell_modules', 'sell_equipment', 'sell_consumables', 'dismiss_crew')
WIDENERS = ('include_fitting', 'include_special')

DEFAULTS = {key: False for key in CATEGORIES + WIDENERS}

ADVANCED = ('include_fitting', 'include_special')
