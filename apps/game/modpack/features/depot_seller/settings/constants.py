from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_depot_seller'
SECTION = 'depot_seller'
GROUP = 'hangar'

# What goes on sale, each off until the player turns it on.
CATEGORIES = ('sell_shells', 'sell_modules', 'sell_equipment', 'sell_consumables', 'dismiss_crew')
# Widen a category; off keeps the sale to what fits none of the own vehicles, regular items bought for credits and
# reserve crew without skills.
WIDENERS = ('include_fitting', 'include_special', 'crew_with_skills')

DEFAULTS = {key: False for key in CATEGORIES + WIDENERS}

ADVANCED = ('include_fitting', 'include_special', 'crew_with_skills')
