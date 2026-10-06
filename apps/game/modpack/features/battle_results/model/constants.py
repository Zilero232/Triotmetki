from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_NEUTRAL, COLOR_UP

RANDOM_BONUS_TYPE = 1
RESULT_COLORS = {'win': COLOR_UP, 'loss': COLOR_DOWN, 'draw': COLOR_NEUTRAL}
UNKNOWN_RESULT = 'draw'

# The summary key of each whole-number stat and its key in a battle event's `stats` (companion/payload).
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
# A battle row's button that opens the hit viewer at that battle (core.events hit_viewer_open).
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

# The repair of the history entries 0.7.0 stored with the results' whole percent read as hundredths (page
# restore_history): a percent up to this, and a change past MAX_BATTLE_DELTA percent, which no battle makes.
WRONG_SCALE_PERCENT = 1.0
MAX_BATTLE_DELTA = 10.0

# The stock post-battle message (RU 1.45 messenger/formatters/service_channel.py BattleResultsFormatter): the results
# reach the mod either before it (the player stayed to the end: they come in battle) or a little after it (the client's
# own results request). The message waits this long for them; held results nobody's message took are pushed as a
# message of their own this long after the hangar opened (the battle's message came before the mod's hook, or never).
STOCK_WAIT_S = 3.0
UNCLAIMED_AFTER_S = 20.0
# Results and released arenas kept for the messages still to come.
NOTICE_ARENAS_LIMIT = 20
# What StockNotices.results_arrived asks of the client for the results that came.
APPEND = 'append'
PUSH = 'push'
HOLD = 'hold'
