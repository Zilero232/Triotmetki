from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_NEUTRAL, font, format_percent
from ....core.moe import rating_to_percent
from .constants import CAROUSEL_GAP


# Fair play: the tile's own vehicle and the player's own dossier.
def carousel_stats(stats_text, damage_rating):
    percent = rating_to_percent(damage_rating)
    if not percent:
        return stats_text
    return u'%s%s%s' % (stats_text or u'', CAROUSEL_GAP, font(format_percent(percent), COLOR_NEUTRAL))
