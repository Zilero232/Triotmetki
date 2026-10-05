# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.component import FeatureComponent
from ....core.client.garage import run_in_order
from ....core.log import log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import ACTION_ACTIVATE, is_due, pick
from ..settings import SCHEMA, SWITCH
from .reads import personal_reserves


def _activator(booster):
    # RU 1.45 client source: gui.shared.gui_items.processors.goodies.BoosterActivator(booster), the reserves
    # window's «Активировать».
    from gui.shared.gui_items.processors.goodies import BoosterActivator
    return lambda: BoosterActivator(booster)


# The personal reserves the player picked stay on: in the first hangar of the game session and, when chosen, whenever
# one of them runs out. The switch and every reserve are off until the player turns them on; a reserve the game refused
# is not tried again in the same session.
class AutoReserves(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.session_done = False
        self.checked_at = 0.0
        self.busy = False
        self.refused = set()
        self.sending = None
        self.account = None
        self.hangar_seen = False
        app.bus.on('hangar', self._on_hangar)
        app.bus.on('tick', self._on_tick)
        self.follow_account(self._on_account)

    # The session and the refused reserves are one account's: another account gets its own first hangar.
    def _on_account(self, account_id):
        if self.account is not None and account_id != self.account:
            self.session_done = False
            self.checked_at = 0.0
            self.refused = set()
            self.hangar_seen = False
        self.account = account_id

    # The app ticks from the login screen on, where the reserves cache is still empty: nothing is read before the
    # account's hangar.
    def _on_hangar(self):
        self.hangar_seen = True
        self._check(time.time())

    def _on_tick(self, now):
        self._check(now)

    def _check(self, now):
        if self.busy or not self.hangar_seen or not self.enabled_in_hangar():
            return
        if not is_due(self.settings.to_dict(), now, self.checked_at, self.session_done):
            return
        summaries, boosters = personal_reserves()
        if not summaries:
            return
        self.session_done = True
        self.checked_at = now
        self._activate(summaries, boosters)

    def activate(self):
        summaries, boosters = personal_reserves()
        return self._activate(summaries, boosters)

    def _activate(self, summaries, boosters):
        summaries = [summary for summary in summaries if summary['id'] not in self.refused]
        picks, refusal = pick(summaries, self.settings.to_dict())
        if refusal:
            return refusal
        self.busy = True
        self.sending = None
        log('auto reserves: activating %s' % ', '.join('%s' % booster_id for booster_id in picks))
        steps = [self._step(booster_id, boosters[booster_id]) for booster_id in picks]
        run_in_order(steps, self._done, 'reserve activation')
        return None

    # run_in_order builds a step only once the one before it was answered, so the last built is the one that failed.
    def _step(self, booster_id, booster):
        make_processor = _activator(booster)

        def build():
            self.sending = booster_id
            return make_processor()

        return build

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        return [{'id': ACTION_ACTIVATE, 'label': self.app.translate('auto_reserves_activate_now'), 'confirm': None}]

    def ui_action(self, action, row=None, value=None):
        if action != ACTION_ACTIVATE or not self.enabled_in_hangar():
            return None
        if self.busy:
            return self.notice_error('auto_reserves_refused_busy')
        refusal = self.activate()
        if refusal:
            return self.notice_error('auto_reserves_refused_%s' % refusal)
        return self.notice_info('auto_reserves_sent')

    @safe
    def _done(self, success):
        self.busy = False
        if success:
            return
        if self.sending is not None:
            self.refused.add(self.sending)
        self.app.ui.notify(self.app.translate('auto_reserves_failed'))
