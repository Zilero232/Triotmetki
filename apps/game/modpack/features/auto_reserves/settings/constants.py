from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_auto_reserves'
SECTION = 'auto_reserves'
GROUP = 'hangar'

# The reserves to keep on, each off until the player picks it: (reserve kind, settings key), in the order they are
# activated when fewer slots are free than reserves picked.
RESERVES = (
    ('credits', 'reserve_credits'),
    ('xp', 'reserve_xp'),
    ('crew_xp', 'reserve_crew_xp'),
    ('free_xp', 'reserve_free_xp'),
)
# session: once, in the first hangar after the game starts; expiry: also every time a picked reserve runs out.
WHEN_SESSION = 'session'
WHEN_EXPIRY = 'expiry'

DEFAULTS = {key: False for _kind, key in RESERVES}
DEFAULTS['when'] = WHEN_SESSION
CHOICES = {'when': (WHEN_SESSION, WHEN_EXPIRY)}
