from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import CARD_FIXED

SWITCH = 'hangar_event_trackers'
SECTION = 'event_trackers'
GROUP = 'hangar'

# `triathlon_shown`: `event` while the client lists a clean-XP competition, `always` also outside it.
DEFAULTS = {
    'show_triathlon': True,
    'triathlon_shown': 'event',
    'show_caravan': True,
}
TRIATHLON_EVENT = 'event'
TRIATHLON_ALWAYS = 'always'
CHOICES = {'triathlon_shown': (TRIATHLON_EVENT, TRIATHLON_ALWAYS)}
# The card's type size follows the design scale (docs/specs/2026-09-30-hud-consolidation-and-design.md section 12).
FIXED = CARD_FIXED
ADVANCED = ('triathlon_shown',)
