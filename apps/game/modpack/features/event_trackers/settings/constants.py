from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_event_trackers'
SECTION = 'event_trackers'
GROUP = 'hangar'

# `triathlon_shown`: `event` while the client lists a clean-XP competition, `always` also outside it.
DEFAULTS = {
    'show_triathlon': True,
    'triathlon_shown': 'event',
    'show_caravan': True,
}
CHOICES = {'triathlon_shown': ('event', 'always')}
# The card's type size follows the design scale (docs/specs/2026-09-30-hud-consolidation-and-design.md section 12).
FIXED = {'font_size': 14}
ADVANCED = ('triathlon_shown',)
