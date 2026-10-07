from __future__ import absolute_import, division, print_function, unicode_literals

TANKS_PATH = '/mod/me/tanks'
MAX_TANKS = 100
MAX_MARKS = 3
MAX_MASTERY = 4

AUTH_STATUSES = (401, 403)
RATE_LIMITED_STATUS = 429
OK_STATUS = 200

REFRESH_AFTER_BATTLE_S = 20.0
RETRY_AFTER_ERROR_S = 120.0
RETRY_AFTER_LIMIT_S = 60.0
MAX_RETRY_S = 1800.0

TANK_KEY = 'tank:%d'
MAX_WATCHED_TANKS = 5

RATING_TIERS = ('very_bad', 'bad', 'below_avg', 'avg', 'good', 'very_good', 'great', 'unicum', 'super_unicum')
TANK_RATINGS = ('wn8',)

RECORD_FIELDS = (('damage', 'max_damage'), ('assist', 'max_assist'), ('frags', 'max_frags'), ('xp', 'max_xp'))
EXPECTED_FIELDS = (('damage', 'damage'), ('spot', 'spot'), ('frag', 'frag'), ('def', 'def'), ('win_rate', 'win_rate'))
