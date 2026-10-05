# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.codec import parse_json_body
from ....core.compat import to_text
from ....core.events import EVENT_MODS_LIST_ALERT
from ....core.log import log, safe
from ..i18n import STRINGS
from ..model import (
    ACTION_CHECK,
    ACTION_OPEN,
    ACTION_SKIP,
    DOWNLOAD_PATH,
    LATEST_PATH,
    clean_release,
    find_update,
    is_shown,
)
from ..model.constants import STATE_KEY
from ..settings import SCHEMA, SECTION, SWITCH
from .reads import installed


# A newer modpack in the site's release index: the badge on the mod's ModsList entry and one notification per version
# (the way ModsList's alertModification and Battle Observer's service messages announce one, docs/research/competitors/
# 2026-10-05-modpacks-deep-dive.md item 15), until the player updates or picks «Пропустить эту версию» (kept in
# state.json). The index is asked once per game session.
class UpdateNotice(FeatureComponent):

    def __init__(self, app):
        self.update = None
        self.asked = False
        stored = app.state.get(STATE_KEY) or {}
        self.skipped = stored.get('skipped') if isinstance(stored, dict) else None
        self.notified = stored.get('notified') if isinstance(stored, dict) else None
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        app.register_state(STATE_KEY, self._stored)
        app.bus.on('hangar', self._on_hangar)

    def _stored(self):
        return {'skipped': self.skipped, 'notified': self.notified}

    def _on_hangar(self):
        if not self.asked and self.enabled_in_hangar():
            self.check()

    def check(self):
        folder, packages = installed()
        if folder is None or not packages:
            log('update notice: no installed packages found, nothing to compare')
            return False
        self.asked = True
        app = self.app
        headers = {'Accept': 'application/json', 'User-Agent': app.user_agent()}
        url = app.config.endpoint(LATEST_PATH % folder)

        def done(status, body, _headers):
            self._answer(status, body, packages)
        app.transport.request('GET', url, headers, None, done)
        return True

    @safe
    def _answer(self, status, body, packages):
        release = clean_release(parse_json_body(body)) if status == 200 else None
        self.update = find_update(release, packages)
        shown = is_shown(self.update, self.skipped)
        self.app.bus.emit(EVENT_MODS_LIST_ALERT, shown)
        if shown and self.settings.get('notify') and self.notified != self.update['version']:
            self.notified = self.update['version']
            self.app.ui.notify(self.app.translate('update_notice_notify_text', version=self.update['version']))
            self.app.save_state()

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        translate = self.app.translate
        actions = [{'id': ACTION_CHECK, 'label': translate('update_notice_check'), 'confirm': None}]
        if is_shown(self.update, self.skipped):
            actions.insert(0, {'id': ACTION_OPEN, 'label': translate('update_notice_open'), 'link': DOWNLOAD_PATH})
            actions.insert(1, {'id': ACTION_SKIP, 'label': translate('update_notice_skip'), 'confirm': None})
        return actions

    def ui_action(self, action, row=None, value=None):
        if not self.enabled_in_hangar():
            return None
        if action == ACTION_SKIP and self.update is not None:
            self.skipped = to_text(self.update['version'])
            self.app.save_state()
            self.app.bus.emit(EVENT_MODS_LIST_ALERT, False)
            return self.notice_info('update_notice_skipped', version=self.skipped)
        if action == ACTION_CHECK:
            if not self.check():
                return self.notice_error('update_notice_refused_installed')
            return self.notice_info('update_notice_checking')
        return None
