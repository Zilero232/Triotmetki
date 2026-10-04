from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import LIVE_METRICS

SWITCH = 'battle_progress'
PANEL_ID = 'battle_progress'
GROUP = 'battle'

# The right top column (core/hud/panel DOCKS battle_right_top), under the stock timer and off the team bases panel and
# quest progress the page keeps under the score strip.
DEFAULTS = {
    'x': -372,
    'y': 60,
    'align_x': 'right',
    'align_y': 'top',
    'row_main_gun': True,
    'row_record': True,
    'row_wn8': True,
    'main_gun_share': False,
    'record_metric': 'damage',
}
CHOICES = {'record_metric': LIVE_METRICS}
# Deleted settings, fixed at their old defaults (spec 2026-09-30 section 12).
FIXED = {'colored': True}
ADVANCED = ('main_gun_share',)
