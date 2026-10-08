from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import OPEN_IN_CHOICES, OPEN_IN_GAME

SWITCH = 'hangar_armor_view'
SECTION = 'armor_view'
GROUP = 'hangar'

DEFAULTS = {
    'context_menu': True,
    'open_in': OPEN_IN_GAME,
}
CHOICES = {
    'open_in': OPEN_IN_CHOICES,
}
