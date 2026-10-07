# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.panel import dock_layout

# UNVERIFIED: the Triathlon round starts when the player joins through the event page (update 1.45).
ROUND_S = 60 * 60
BEST_BATTLES = 3
MIN_TIER = 6
RANDOM_BONUS_TYPE = 1
MAX_ROUNDS = 30
MAX_ROUND_BATTLES = 40
MAX_NAME = 32
CARDINALITY_RANGE = (1, 10)
TIER_RANGE = (1, 11)
# RU 1.45 gui/event_boards/event_boards_items.OBJECTIVE_PARAMETERS.ORIGINALXP: the objective of a clean-XP competition.
CLEAN_XP_OBJECTIVE = 'originalXP'

# RU 1.45 web/web_client_api/trading_caravan: the account entitlement the Trading Caravan page reads as the token count.
CARAVAN_ENTITLEMENT = 'caravan_guaranteed_reward_points'

DAY_S = 24 * 60 * 60
HOUR_S = 60 * 60
MINUTE_S = 60
REFRESH_EVERY_S = 5.0
STORE_FILE = 'event_trackers_%d.json'

TRIATHLON_PANEL = 'otmetki.event_trackers.triathlon'
CARAVAN_PANEL = 'otmetki.event_trackers.caravan'
HANGAR_LAYOUT = dock_layout('hangar_right')
TITLE_SIZE_STEP = 2

CARD_WIDTH = 264
TIER_NUMERALS = {
    1: u'I',
    2: u'II',
    3: u'III',
    4: u'IV',
    5: u'V',
    6: u'VI',
    7: u'VII',
    8: u'VIII',
    9: u'IX',
    10: u'X',
    11: u'XI',
}
