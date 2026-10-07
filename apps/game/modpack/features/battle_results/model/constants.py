from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_NEUTRAL, COLOR_UP

RANDOM_BONUS_TYPE = 1
RESULT_COLORS = {'win': COLOR_UP, 'loss': COLOR_DOWN, 'draw': COLOR_NEUTRAL}
UNKNOWN_RESULT = 'draw'

STAT_FIELDS = {
    'xp': 'xp',
    'free_xp': 'free_xp',
    'credits': 'credits',
    'repair': 'repair_cost',
    'ammo': 'ammo_cost',
    'consumables': 'consumables_cost',
    'damage': 'damage_dealt',
    'assist_radio': 'damage_assisted_radio',
    'assist_track': 'damage_assisted_track',
    'assist_stun': 'damage_assisted_stun',
    'blocked': 'damage_blocked',
    'frags': 'frags',
    'spotted': 'spotted',
    'shots': 'shots',
    'hits': 'direct_enemy_hits',
    'pens': 'piercing_enemy_hits',
    'life_time': 'life_time_s',
}
ASSIST_KEYS = ('assist_radio', 'assist_track', 'assist_stun')
COST_KEYS = ('repair', 'ammo', 'consumables')

STATE_KEY = 'battle_results_history'
SESSION_ROW = 'session'
ACTION_CLEAR = 'clear'
ACTION_HITS = 'hit_viewer'
SITE_BATTLES_PATH = '/me/battles'
HISTORY_KEYS = (
    'arena',
    'time',
    'result',
    'bonus_type',
    'vehicle',
    'tier',
    'map',
    'duration',
    'xp',
    'free_xp',
    'credits',
    'repair',
    'ammo',
    'consumables',
    'net_credits',
    'damage',
    'assist',
    'assist_radio',
    'assist_track',
    'assist_stun',
    'blocked',
    'frags',
    'spotted',
    'shots',
    'hits',
    'pens',
    'life_time',
    'alive',
    'moe_percent',
    'moe_delta',
    'marks_on_gun',
)

WRONG_SCALE_PERCENT = 1.0
MAX_BATTLE_DELTA = 10.0

# RU 1.45 messenger/formatters/service_channel.py BattleResultsFormatter.
STOCK_WAIT_S = 3.0
UNCLAIMED_AFTER_S = 20.0
NOTICE_ARENAS_LIMIT = 20
APPEND = 'append'
PUSH = 'push'
HOLD = 'hold'
