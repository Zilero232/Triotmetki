from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_hit_viewer'
SECTION = 'hit_viewer'
GROUP = 'hangar'

DEFAULTS = {
    'keep_battles': 20,
    'record_received': True,
    'record_dealt': True,
}

LIMITS = {'keep_battles': (1, 30)}
