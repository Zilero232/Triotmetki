from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import DETAIL_MEDIUM, DETAILS, DISTANCE_LIMITS, MODE_EFFECTIVE, MODES, OPACITY_LIMITS

SWITCH = 'hangar_armor_view'
SECTION = 'armor_view'
GROUP = 'hangar'

DEFAULTS = {
    'context_menu': True,
    'mode': MODE_EFFECTIVE,
    'detail': DETAIL_MEDIUM,
    'distance': 100,
    'opacity': 60,
}
CHOICES = {
    'mode': MODES,
    'detail': DETAILS,
}
LIMITS = {
    'distance': DISTANCE_LIMITS,
    'opacity': OPACITY_LIMITS,
}
