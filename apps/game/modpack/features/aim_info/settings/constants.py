from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_aim_info'
SECTION = 'aim_info'
GROUP = 'battle'

# The aim circle scale is off by default: it redraws what the client draws, so it waits for the player (and for
# the answer of the MOST catalogue on grey features, docs/ops/most-publishing.md). No armour readout: Lesta forbids
# in-battle armour analysis.
DEFAULTS = {
    'target_distance': True,
    'shell_tooltips': True,
    'aim_circle': False,
    'aim_circle_scale': 70,
}

LIMITS = {'aim_circle_scale': (40, 100)}
ADVANCED = ('aim_circle_scale',)
