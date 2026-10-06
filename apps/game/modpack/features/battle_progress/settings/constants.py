from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_progress'
PANEL_ID = 'battle_progress'
GROUP = 'battle'

# Right of the team HP strip, as Battle Observer places its main gun: the page puts the left edge 308 px right of the
# middle at y 4, and under the team HP strip on a screen narrower than 1700 design px (core/hud/panel ATTACHED
# score_right); this place (centred 423 px right of the middle) is the one used until the page measures it.
DEFAULTS = {
    'x': 423,
    'y': 4,
    'align_x': 'center',
    'align_y': 'top',
    'row_main_gun': True,
    'row_wn8': True,
    'main_gun_share': False,
}
# Deleted settings, fixed at their old defaults (spec 2026-09-30 section 12).
FIXED = {'colored': True}
ADVANCED = ('main_gun_share',)
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = ((-372, 60, 'right', 'top'),)
