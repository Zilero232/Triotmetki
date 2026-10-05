from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import CENTRE_MARKERS, MARKERS

SWITCH = 'battle_gun_arc'
PANEL_ID = 'gun_arc'
GROUP = 'battle'

# The markers stand where the gun stops, wherever the camera puts them: the panel follows the reticle and is not
# dragged (a drag would save a screen position).
DEFAULTS = {
    'x': 0,
    'y': 0,
    'align_x': 'center',
    'align_y': 'center',
    'drag': False,
    'marker': MARKERS[0],
    'centre_marker': CENTRE_MARKERS[0],
    'fast_redraw': False,
}
CHOICES = {'marker': MARKERS, 'centre_marker': CENTRE_MARKERS}
ADVANCED = ('fast_redraw',)
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = (
    (0, 110, 'center', 'center'),
    (0, 190, 'center', 'center'),
    (0, 96, 'center', 'center'),
)
