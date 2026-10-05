# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.component import FeatureComponent
from ....core.events import EVENT_HIT_VIEWER_BATTLES, EVENT_HIT_VIEWER_OPEN
from ....core.log import safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import ACTION_CLEAR, ACTION_OPEN, settings_page
from ..settings import SCHEMA, SWITCH
from .mods_list import ModsListEntry
from .recorder import HitRecorder
from .screen import HitViewerScreen


# «Просмотр попаданий»: the recorder keeps the hits between the own tank and other vehicles of the last battles, the
# screen shows them on the vehicle model in the hangar. It opens from its own ModsList entry (the latest battle; greyed
# out in a battle queue, as BattleHits does), its card and page in the settings window and on
# `hit_viewer_open(battle_id)` from another package (a battle results or a replay row), which first asks
# `hit_viewer_battles(reply)` for the battles it can open.
class HitViewer(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.recorder = HitRecorder(self)
        self.screen = HitViewerScreen(self, self.recorder)
        app.bus.on(EVENT_HIT_VIEWER_OPEN, self.open_battle)
        app.bus.on(EVENT_HIT_VIEWER_BATTLES, self._answer_battles)
        self.queued = False
        self.mods_list = ModsListEntry(lambda: self.open_battle(None))
        app.bus.on('battle_enter', lambda: self.screen.close(restore_hangar=False))
        app.bus.on('hangar', self._on_hangar)
        app.bus.on('enqueued', self._on_enqueued)
        app.bus.on('dequeued', self._on_dequeued)

    def settings_changed(self, changed):
        if 'keep_battles' in changed:
            self.recorder.resize()
            self.screen.battles_changed()
        self.mods_list.set_available(self._can_open())

    def _can_open(self):
        return self.enabled_in_hangar() and not self.queued

    def _on_hangar(self):
        self.queued = False
        translate = self.app.translate
        self.mods_list.install(translate('component_hit_viewer'), translate('hv_mods_list'), self._can_open())

    def _on_enqueued(self):
        self.queued = True
        self.screen.close(restore_hangar=False)
        self.mods_list.set_available(False)

    def _on_dequeued(self):
        self.queued = False
        self.mods_list.set_available(self._can_open())

    def open_battle(self, battle_id=None):
        if self._can_open():
            BigWorld.callback(0, safe(lambda: self.screen.open(battle_id)))

    def _answer_battles(self, reply):
        if self.enabled_in_hangar():
            reply([battle['id'] for battle in self.recorder.battles()])

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        translate = self.app.translate
        return [
            {'id': ACTION_OPEN, 'label': translate('hv_open_latest'), 'confirm': None},
            {'id': ACTION_CLEAR, 'label': translate('hv_clear'), 'confirm': translate('hv_clear_confirm')},
        ]

    def ui_page(self):
        if not self.enabled():
            return None
        return settings_page(self.recorder.battles(), self.app.translate)

    def ui_action(self, action, row=None, value=None):
        if not self.enabled_in_hangar():
            return None
        if action == ACTION_CLEAR:
            self.screen.close()
            self.recorder.clear()
            return self.notice_info('hv_cleared')
        if action != ACTION_OPEN:
            return None
        refusal = self.screen.refusal(row)
        if refusal is not None:
            return self.notice_error(refusal)
        self.open_battle(row)
        return self.notice_info('hv_opening')
