from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_auto_reserves'
SECTION = 'auto_reserves'
GROUP = 'hangar'

RESERVES = (
    ('credits', 'reserve_credits'),
    ('xp', 'reserve_xp'),
    ('crew_xp', 'reserve_crew_xp'),
    ('free_xp', 'reserve_free_xp'),
)
WHEN_SESSION = 'session'
WHEN_EXPIRY = 'expiry'

DEFAULTS = {key: False for _kind, key in RESERVES}
DEFAULTS['when'] = WHEN_SESSION
CHOICES = {'when': (WHEN_SESSION, WHEN_EXPIRY)}
