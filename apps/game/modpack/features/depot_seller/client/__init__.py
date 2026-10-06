# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import ACTION_REFRESH, FeatureComponent
from ....core.log import safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import (
    ACTION_SELL,
    REFUSE_CHANGED,
    build_page,
    confirm_text,
    is_confirmed,
    plan,
    sell_action,
)
from ..settings import SCHEMA, SWITCH
from .reads import depot_items, reserve_crew, tankmen_by_id
from .sell import sell


# The depot sale: the window page lists what the settings put on sale, «Продать» asks with the items and the credits
# and sends the depot's own request only when the stock is still what the player confirmed.
class DepotSeller(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.busy = False

    def _plan(self):
        return plan(depot_items(), reserve_crew(), self.settings.to_dict())

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        translate = self.app.translate
        sale, _refusal = self._plan()
        refresh = {'id': ACTION_REFRESH, 'label': translate('depot_seller_refresh'), 'confirm': None}
        if sale is None or self.busy:
            return [refresh]
        confirm = confirm_text(sale, translate)
        return [{'id': sell_action(sale), 'label': translate('depot_seller_sell'), 'confirm': confirm}, refresh]

    def ui_page(self):
        if not self.enabled_in_hangar():
            return None
        sale, refusal = self._plan()
        return build_page(sale, refusal, self.app.translate)

    def ui_action(self, action, row=None, value=None):
        if not action.startswith(ACTION_SELL) or not self.enabled_in_hangar() or self.busy:
            return None
        sale, refusal = self._plan()
        if sale is None:
            return self.notice_error('depot_seller_refused_%s' % refusal)
        if not is_confirmed(action, sale):
            return self.notice_error('depot_seller_refused_%s' % REFUSE_CHANGED)

        tankmen = tankmen_by_id([member['inv_id'] for member in sale['crew']])
        self.busy = True
        try:
            sell(sale, tankmen, self._done)
        except Exception:
            self.busy = False
            raise
        return self.notice_info('depot_seller_sent')

    @safe
    def _done(self, success):
        self.busy = False
        if not success:
            self.app.ui.notify(self.app.translate('depot_seller_failed'))
