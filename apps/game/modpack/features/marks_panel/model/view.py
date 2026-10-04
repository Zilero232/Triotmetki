from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import DETAIL_SWITCHES, LOOK_BOX, LOOK_SILHOUETTE


# The settings one render reads. With `alt_detail` on, holding Alt shows the extended view with every detail row,
# whatever the style and the switches say; at rest the panel keeps its own style.
class PanelView(object):

    def __init__(self, settings, held=False):
        self.settings = settings
        self.overrides = {}
        if held and settings.get('alt_detail'):
            self.overrides = dict((key, True) for key in DETAIL_SWITCHES)
            self.overrides['style'] = 'extended'

    def get(self, key):
        return self.overrides[key] if key in self.overrides else self.settings.get(key)

    # The plate's look follows the player's style, also while Alt shows the extended rows.
    def look(self):
        return LOOK_SILHOUETTE if self.settings.get('style') == LOOK_SILHOUETTE else LOOK_BOX
