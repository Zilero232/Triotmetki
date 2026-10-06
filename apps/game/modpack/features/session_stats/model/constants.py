# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_UP
from ....core.own_result import RESULT_DRAW, RESULT_LOSS, RESULT_WIN

REGULAR_BONUS_TYPE = 1
ACTION_RESET = 'new_session'
ACTION_SITE = 'site'
SITE_PATH = '/me'

# The strip of the last own battles of the session, oldest first: `result` of a battle event (companion/payload), its
# colour on the card (core/hud/widget TONES) and in the text.
RESULTS = (RESULT_WIN, RESULT_LOSS, RESULT_DRAW)
RECENT_LIMIT = 10
RESULT_COLORS = {RESULT_WIN: COLOR_UP, RESULT_LOSS: COLOR_DOWN, RESULT_DRAW: COLOR_MUTED}
# The colour of a MoE change by its sign.
CHANGE_COLORS = {1: COLOR_UP, -1: COLOR_DOWN, 0: COLOR_MUTED}
# The session counter each result raises.
RESULT_COUNTERS = {RESULT_WIN: 'wins', RESULT_LOSS: 'losses', RESULT_DRAW: 'draws'}
# An own battle waits for its results from the start until they arrive or this long has passed: a random battle lasts at
# most 15 minutes, and after a game restart the companion no longer looks for the results of earlier arenas.
PENDING_RESULTS_TTL_S = 30 * 60

# contract/session-share.schema.json.
SHARE_PATH = '/mod/me/session-share'
SHARE_SEND_PATH = '/mod/me/session-share/send'
CHANNELS = ('telegram', 'discord')
BOTH_CHANNELS = 'both'
SHARE_STATE_KEY = 'session_share_synced'
SHARE_RETRY_S = 300
ACTION_SHARE = 'share_now'
# A refused /send: 409 channel_not_linked and 404 session_not_found get their own short line.
SHARE_SEND_FAILURES = {404: 'session_share_not_found', 409: 'session_share_not_linked'}
SHARE_SEND_FAILED = 'session_share_failed'
# A /session-share answer: stored, refused until the player changes the switch (409 channel_not_linked: the chosen
# channel is not linked on the site, asking again cannot help), or asked again after SHARE_RETRY_S.
SHARE_SYNCED = 'synced'
SHARE_REFUSED = 'refused'
SHARE_RETRY = 'retry'
SHARE_REFUSED_STATUSES = (409,)
SHARE_REFUSED_NOTICE = 'session_share_not_linked'

COUNTERS = (
    'battles',
    'wins',
    'losses',
    'draws',
    'survived',
    'damage_dealt',
    'damage_assisted',
    'damage_blocked',
    'frags',
    'spotted',
    'xp',
    'credits',
    'shots',
    'direct_enemy_hits',
    'piercing_enemy_hits',
)
# The counters a battle event's `stats` (companion/payload) carries under the same name; the assist counter sums
# ASSISTED_STATS.
STAT_COUNTERS = (
    'damage_dealt',
    'damage_blocked',
    'frags',
    'spotted',
    'xp',
    'credits',
    'shots',
    'direct_enemy_hits',
    'piercing_enemy_hits',
)
ASSISTED_STATS = ('damage_assisted_radio', 'damage_assisted_track', 'damage_assisted_stun')
VEHICLE_COUNTERS = ('battles', 'wins', 'damage_dealt')

# The MoE change per tank of the session (model/moe.py): its state key and the tanks the card lists, newest first.
MOE_STATE_KEY = 'session_moe'
MOE_ROWS = 3

# The hangar card (model/widget.py): width in design px, the win rate from which it shows as good.
CARD_WIDTH = 264
EVEN_WIN_RATE = 50.0
# The text's header size (model/text.py).
TITLE_SIZE = 15

# contract/goals.schema.json: the goals set on the site's «Мой кабинет» page.
GOALS_PATH = '/mod/me/goals'
GOALS_KEY = 'goals'
# The state key of the retired session_goals feature: the goals it already announced stay announced.
GOALS_STATE_KEY = 'session_goals_done'
GOAL_METRICS = ('winRate', 'wn8', 'avgDamage', 'battles', 'moe', 'broneIndex')
PERCENT_METRICS = ('winRate', 'moe')
SHOWN_STATUSES = ('active', 'achieved')
ACTIVE = 'active'
ACHIEVED = 'achieved'
MAX_GOALS = 20
MAX_REMEMBERED = 100
DONE_MARK = u'✓'

# contract/ratings.schema.json: the account overview; its `session` repeats the card's own numbers and is not read.
OVERVIEW_PATH = '/mod/me/overview'
OVERVIEW_KEY = 'overview'
ACCOUNT_RATINGS = ('wn8', 'eff')
# The account line's facts after its WN8, in this order, each behind its `metric_<name>` switch.
ACCOUNT_FACTS = ('win_rate', 'avg_damage', 'eff')
METRIC_KEY = 'metric_%s'
FACT_SEPARATOR = u' · '

# RATING_SCALES.wn8 of @otmetki/ratings (lower bound, tier): the ingest answer's session WN8 carries no tier.
WN8_SCALE = (
    (0, 'very_bad'),
    (300, 'bad'),
    (650, 'below_avg'),
    (900, 'avg'),
    (1200, 'good'),
    (1600, 'very_good'),
    (2000, 'great'),
    (2450, 'unicum'),
    (2900, 'super_unicum'),
)
WN8_BOUNDS = tuple(bound for bound, _ in WN8_SCALE)

# More percent than a battle can move the MoE (core.moe MAX_BATTLE_CHANGE): a session change past this per battle is a
# misread.
MAX_BATTLE_DELTA = 10.0

# The settings window's editor (docs/specs/2026-09-30-hud-consolidation-and-design.md section 12.3): its field groups
# and the Session card it previews, an evening of seven battles with two site goals and the account line.
EDITOR_GROUPS = (
    ('session', ('show_moe', 'notice_line')),
    ('goals', ('show_goals',)),
    ('account', ('show_account', 'metric_wn8', 'metric_win_rate', 'metric_avg_damage', 'metric_eff')),
)
SAMPLE_ID = 'card'
SAMPLE_SUMMARY = {
    'battles': 7,
    'win_rate': 57.14,
    'avg_damage': 3120.0,
    'wn8': 2310,
    'recent': ('win', 'loss', 'win', 'win', 'draw', 'loss', 'win'),
    'pending': 0,
}
SAMPLE_MOE = ({'tank_id': 1, 'change': 0.42, 'percent': 86.54},)
SAMPLE_GOALS = (
    {'id': 'wn8', 'metric': 'wn8', 'tank_id': None, 'target': 2500.0, 'baseline': 2000.0, 'current': 2310.0,
     'status': 'active'},
    {'id': 'moe', 'metric': 'moe', 'tank_id': 2, 'target': 85.0, 'baseline': 70.0, 'current': 85.4,
     'status': 'achieved'},
)
SAMPLE_OVERVIEW = {
    'overall': {
        'battles': 18452,
        'win_rate': 53.8,
        'avg_damage': 2140.0,
        'wn8': {'value': 2050.0, 'tier': 'great'},
        'eff': {'value': 1650.0, 'tier': 'good'},
    },
}
SAMPLE_VEHICLES = {1: 'IS-7', 2: 'T-62A'}
