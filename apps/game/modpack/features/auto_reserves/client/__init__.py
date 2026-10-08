# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import time

from ....core.client.component import FeatureComponent
from ....core.client.garage import run_in_order
from ....core.log import log, safe
from ....core.storage import JsonFile
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import ACTION_ACTIVATE, CHECK_EVERY_S, free_slots, is_due, is_slot_freed, pick
from ..model.opt_in import clean_state, is_opted_in, migrated, with_choice
from ..settings import SCHEMA, SWITCH
from .constants import OPT_IN_FILE
from .reads import personal_reserves


def _activator(booster):
    # RU 1.45 client source: gui.shared.gui_items.processors.goodies.BoosterActivator(booster).
    from gui.shared.gui_items.processors.goodies import BoosterActivator
    return lambda: BoosterActivator(booster)


class AutoReserves(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.opt_in_file = JsonFile(os.path.join(app.config_dir, OPT_IN_FILE))
        self.opt_ins = clean_state(self.opt_in_file.read())
        self.session_done = False
        self.checked_at = 0.0
        self.busy = False
        self.refused = set()
        self.free_at_refusal = None
        self.retried_at = 0.0
        self.sending = None
        self.account = None
        self.hangar_seen = False
        app.bus.on('hangar', self._on_hangar)
        app.bus.on('tick', self._on_tick)
        self.follow_account(self._on_account)

    def _on_account(self, account_id):
        if self.account is not None and account_id != self.account:
            self.session_done = False
            self.checked_at = 0.0
            self.refused = set()
            self.free_at_refusal = None
            self.hangar_seen = False
        self.account = account_id
        self._show_choice_of(account_id)

    def _keep_opt_ins(self, state):
        if state == self.opt_ins:
            return

        self.opt_ins = state
        self.opt_in_file.write(state)

    def _show_choice_of(self, account_id):
        config = self.app.config
        is_switch_on = bool(config.get(SWITCH))

        self._keep_opt_ins(migrated(self.opt_ins, account_id, is_switch_on))

        is_chosen = is_opted_in(self.opt_ins, account_id)
        if is_chosen == is_switch_on:
            return
        config.update({SWITCH: is_chosen})
        self.app.save_config()

    def settings_changed(self, changed):
        account_id = self.app.account_id
        if SWITCH not in changed or not account_id:
            return

        is_switch_on = bool(self.app.config.get(SWITCH))
        self._keep_opt_ins(with_choice(self.opt_ins, account_id, is_switch_on))

    def enabled(self):
        if not FeatureComponent.enabled(self):
            return False

        account_id = self.app.account_id
        return bool(account_id) and is_opted_in(self.opt_ins, account_id)

    def _on_hangar(self):
        self.hangar_seen = True
        self._check(time.time())

    def _on_tick(self, now):
        self._retry_when_a_slot_frees(now)
        self._check(now)

    def _retry_when_a_slot_frees(self, now):
        if not self.refused or not self.enabled_in_hangar():
            return
        if now - self.retried_at < CHECK_EVERY_S:
            return

        self.retried_at = now
        summaries, _boosters = personal_reserves()
        if not is_slot_freed(summaries, self.free_at_refusal):
            return

        self.refused = set()
        self.free_at_refusal = None
        self.session_done = False

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

    def _step(self, booster_id, booster):
        make_processor = _activator(booster)

        def build():
            self.sending = booster_id
            return make_processor()

        return build

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []

        translate = self.app.translate
        action = {
            'id': ACTION_ACTIVATE,
            'label': translate('auto_reserves_activate_now'),
            'confirm': translate('auto_reserves_activate_confirm'),
        }
        return [action]

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
            summaries, _boosters = personal_reserves()
            self.free_at_refusal = free_slots(summaries)
        self.app.ui.notify(self.app.translate('auto_reserves_failed'))
