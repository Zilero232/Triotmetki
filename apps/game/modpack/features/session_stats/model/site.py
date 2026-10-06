from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.me import REFRESH_AFTER_BATTLE_S, ReadState, owned, stats
from .constants import ACCOUNT_RATINGS, GOALS_KEY, OVERVIEW_KEY


def parse_overview(data, account_id):
    if not owned(data, account_id):
        return None
    overall = data.get('overall')
    return {'overall': stats(overall, ACCOUNT_RATINGS) if isinstance(overall, dict) else None}


class SiteData(ReadState):

    def __init__(self, account_id=None):
        ReadState.__init__(self)
        self.reset(account_id)

    def reset(self, account_id=None):
        ReadState.reset(self)
        self.account_id = account_id
        self.goals = []
        self.overview = None

    def store_overview(self, overview):
        if overview is not None:
            self.overview = overview

    def after_battle(self, now):
        self.stale([GOALS_KEY, OVERVIEW_KEY], now, REFRESH_AFTER_BATTLE_S)
