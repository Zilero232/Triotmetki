from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import STOCK_BADGE_CHOICES, STOCK_REPLACE

SWITCH = 'battle_pack_badge'
SECTION = 'pack_badge'
GROUP = 'battle'

DEFAULTS = {
    'stock_badge': STOCK_REPLACE,
}
CHOICES = {'stock_badge': STOCK_BADGE_CHOICES}
