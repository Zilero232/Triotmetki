from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 notification.settings.NOTIFICATION_TYPE names; plain MESSAGE notifications are never hidden.
CATEGORIES = {
    'hide_promo': (
        'NOTIFY_CENTER_POP_UP',
        'WOT_PLUS_INTRO',
        'AUCTION_STAGE_START',
        'AUCTION_STAGE_FINISH',
        'BLACK_MARKET_STAGE_START',
        'BLACK_MARKET_STAGE_FINISH',
        'RESOURCE_WELL_START',
    ),
    'hide_reminders': (
        'RECRUIT_REMINDER',
        'EMAIL_CONFIRMATION_REMINDER',
        'BATTLE_PASS_SWITCH_CHAPTER_REMINDER',
        'BATTLE_MATTERS_TASK_REMINDER',
        'MISSING_EVENTS',
    ),
    'hide_friend_requests': ('FRIENDSHIP_RQ',),
    'hide_clan': ('CLAN_INVITES', 'CLAN_APPS', 'CLAN_APP_ACTION', 'CLAN_INVITE_ACTION', 'CLAN_INVITE', 'CLAN_APP'),
}
NEVER_HIDDEN = ('MESSAGE', 'UNDEFINED')
# RU 1.45 notification/settings.py: AUCTION_STAGE_START = TRADING_CARAVAN_REFILL = 19.
CLASS_MARKERS = {
    'AUCTION_STAGE_START': 'Auction',
    'TRADING_CARAVAN_REFILL': 'TradingCaravan',
}
