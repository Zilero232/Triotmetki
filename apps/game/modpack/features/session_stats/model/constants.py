# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_MUTED, COLOR_UP
from ....core.own_result import RESULT_DRAW, RESULT_LOSS, RESULT_WIN

REGULAR_BONUS_TYPE = 1
ACTION_RESET = 'new_session'
ACTION_SITE = 'site'
SITE_PATH = '/me'

RESULTS = (RESULT_WIN, RESULT_LOSS, RESULT_DRAW)
RECENT_LIMIT = 10
RESULT_COLORS = {RESULT_WIN: COLOR_UP, RESULT_LOSS: COLOR_DOWN, RESULT_DRAW: COLOR_MUTED}
CHANGE_COLORS = {1: COLOR_UP, -1: COLOR_DOWN, 0: COLOR_MUTED}
RESULT_COUNTERS = {RESULT_WIN: 'wins', RESULT_LOSS: 'losses', RESULT_DRAW: 'draws'}
PENDING_RESULTS_TTL_S = 30 * 60

SHARE_PATH = '/mod/me/session-share'
SHARE_SEND_PATH = '/mod/me/session-share/send'
CHANNELS = ('telegram', 'discord')
BOTH_CHANNELS = 'both'
SHARE_STATE_KEY = 'session_share_synced'
SHARE_RETRY_S = 300
ACTION_SHARE = 'share_now'
SHARE_SEND_FAILURES = {404: 'session_share_not_found', 409: 'session_share_not_linked'}
SHARE_SEND_FAILED = 'session_share_failed'
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

MOE_STATE_KEY = 'session_moe'
MOE_ROWS = 3

CARD_WIDTH = 264
EVEN_WIN_RATE = 50.0
TITLE_SIZE = 15

GOALS_PATH = '/mod/me/goals'
GOALS_KEY = 'goals'
GOALS_STATE_KEY = 'session_goals_done'
GOAL_METRICS = ('winRate', 'wn8', 'avgDamage', 'battles', 'moe', 'broneIndex')
PERCENT_METRICS = ('winRate', 'moe')
SHOWN_STATUSES = ('active', 'achieved')
ACTIVE = 'active'
ACHIEVED = 'achieved'
MAX_GOALS = 20
MAX_REMEMBERED = 100
DONE_MARK = u'✓'

OVERVIEW_PATH = '/mod/me/overview'
OVERVIEW_KEY = 'overview'
ACCOUNT_RATINGS = ('wn8', 'eff')
ACCOUNT_FACTS = ('win_rate', 'avg_damage', 'eff')
METRIC_KEY = 'metric_%s'
FACT_SEPARATOR = u' · '

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

MAX_BATTLE_DELTA = 10.0

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
