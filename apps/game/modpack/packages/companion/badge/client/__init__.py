from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.me import can_read, post_signed
from ....core.errors import ReasonError
from ....core.events import EVENT_COMPONENT_SETTINGS
from ....core.log import log
from .. import (
    COMPANION_COMPONENT,
    ENABLED_KEY,
    PREFERENCE_PATH,
    SHOW_KEY,
    STATE_KEY,
    PreferenceSync,
    preference_body,
    restore_synced,
    wanted_visible,
)


class BadgePreference(object):

    def __init__(self, app):
        self.app = app
        self.sync = PreferenceSync()
        app.register_account_state(STATE_KEY, lambda: self.sync.synced, self._load)
        bus = app.bus
        bus.on('hangar', self._on_hangar)
        bus.on('tick', self._on_tick)
        bus.on('rebind', self._on_rebind)
        bus.on(EVENT_COMPONENT_SETTINGS, self._on_settings)

    def _load(self, stored):
        self.sync.reset(restore_synced(stored))

    # A new device (rebind) has no stored switch on the site yet.
    def _on_rebind(self):
        self.sync.reset()
        self.report(time.time())

    def _on_hangar(self):
        self.report(time.time())

    def _on_tick(self, now):
        self.report(now)

    def _on_settings(self, component_id, changed):
        if component_id != COMPANION_COMPONENT:
            return
        if SHOW_KEY in changed or ENABLED_KEY in changed:
            self.sync.changed()
            self.report(time.time())

    def report(self, now):
        wanted = wanted_visible(self.app.config)
        if not can_read(self.app) or not self.sync.needs_sync(wanted, now):
            return

        try:
            payload = preference_body(self.app.current_credentials(), wanted)
        except ReasonError as error:
            log('badge preference not reported: %s' % error.reason)
            return

        self.sync.sent()
        account_id = self.app.account_id

        def done(status, data, retry_after):
            if self.app.account_id != account_id:
                return
            self.sync.answered(wanted, status, time.time())
            self.app.save_state()

        post_signed(self.app, PREFERENCE_PATH, payload, done)
