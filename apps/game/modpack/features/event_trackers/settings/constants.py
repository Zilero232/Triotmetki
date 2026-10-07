from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import CARD_FIXED

SWITCH = 'hangar_event_trackers'
SECTION = 'event_trackers'
GROUP = 'hangar'

DEFAULTS = {
    'show_triathlon': True,
    'triathlon_shown': 'event',
    'show_caravan': True,
}
TRIATHLON_EVENT = 'event'
TRIATHLON_ALWAYS = 'always'
CHOICES = {'triathlon_shown': (TRIATHLON_EVENT, TRIATHLON_ALWAYS)}
FIXED = CARD_FIXED
ADVANCED = ('triathlon_shown',)
