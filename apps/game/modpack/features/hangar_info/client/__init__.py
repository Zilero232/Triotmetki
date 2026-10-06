from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.component import FeatureComponent
from ....core.client.game import selected_vehicle
from ....core.hud import EVENT_RESET_LAYOUT, HangarLabel
from ....core.log import safe
from ..i18n import STRINGS
from ..model import armor_actions, format_info, format_widget, layout_of
from ..settings import SCHEMA, SECTION, SWITCH
from .constants import HANGAR_PANEL, LAYOUT_KEYS, PING_REQUEST_S
from .reads import online, ping, request_ping, server_name


class HangarInfo(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.label = HangarLabel(app, HANGAR_PANEL)
        self.pinged_at = 0.0
        app.bus.on('hangar', self._on_hangar)
        app.bus.on('tick', self._on_tick)
        app.bus.on('battle_enter', self.label.hide)
        app.bus.on(EVENT_RESET_LAYOUT, self._on_reset_layout)

    def _on_hangar(self):
        self.render(time.time())

    def _on_tick(self, now):
        self.render(now)

    def settings_changed(self, changed):
        self.label.hide()
        self.render(time.time())

    def _on_reset_layout(self):
        if self.reset_place(LAYOUT_KEYS):
            self.settings_changed(LAYOUT_KEYS)

    def _request_ping(self, now):
        if self.settings.get('show_ping') and now - self.pinged_at >= PING_REQUEST_S:
            self.pinged_at = now
            request_ping()

    def _online(self):
        if not self.settings.get('show_online'):
            return None, None
        return online()

    def info(self, now):
        self._request_ping(now)
        cluster, region = self._online()
        return {'server': server_name(), 'ping': ping(), 'online': cluster, 'region_online': region}

    def ui_actions(self):
        if not self.enabled():
            return []
        return armor_actions(getattr(selected_vehicle(), 'name', None), self.app.translate)

    @safe
    def render(self, now):
        if not self.enabled_in_hangar():
            self.label.clear()
            return
        info = self.info(now)
        translate = self.app.translate

        text = format_info(info, self.settings, translate, now)
        widget = format_widget(info, self.settings, translate, now)
        self.label.show(text, layout_of(self.settings), self.save_place, widget=widget)
