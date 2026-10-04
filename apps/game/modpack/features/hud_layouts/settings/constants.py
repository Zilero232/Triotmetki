from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.modes import LAYOUT_COMPACT, LAYOUT_FULL, LAYOUT_OFF, LAYOUTS

SWITCH = 'battle_hud_layouts'
SECTION = 'hud_layouts'
GROUP = 'battle'

# One layout per battle type (core.hud.modes.MODES): random and Onslaught keep every panel, the pages built for other
# modes get the essentials, Steel Hunter (a HUD of its own) none.
DEFAULTS = {
    'random': LAYOUT_FULL,
    'comp7': LAYOUT_FULL,
    'frontline': LAYOUT_COMPACT,
    'event': LAYOUT_COMPACT,
    'battle_royale': LAYOUT_OFF,
    'own_places': True,
}
CHOICES = {
    'random': LAYOUTS,
    'comp7': LAYOUTS,
    'frontline': LAYOUTS,
    'event': LAYOUTS,
    'battle_royale': LAYOUTS,
}

ADVANCED = ('own_places',)
