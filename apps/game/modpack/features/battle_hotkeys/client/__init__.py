from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.hotkey import HotkeyChoice
from ....core.client.hud.panel import BattlePanel, PanelSpec
from ....core.client.native import apply_settings, read_settings
from ....core.client.timer import Ticker
from ....core.log import log, safe
from .. import settings
from ..i18n import STRINGS
from ..model import notice_text, preview, toggled, wanted_toggles
from ..model.constants import HOTKEYS, PREVIEW_SIZE
from ..model.widget import notice_widget

PANEL_SPEC = PanelSpec.of(settings, STRINGS, preview, PREVIEW_SIZE)


def _option_hotkey(option, on_toggle):
    return HotkeyChoice(HOTKEYS, lambda: on_toggle(option))


class BattleHotkeys(BattlePanel):

    def __init__(self, app):
        self.hotkeys = {}
        self.ticker = None
        self.armed = False
        BattlePanel.__init__(self, app, PANEL_SPEC)

    def _on_start(self, *args):
        BattlePanel._on_start(self, *args)
        if self.enabled() and not self.armed:
            self._arm()

    def start(self, battle_player):
        self._arm()

    def stop(self):
        for hotkey in self.hotkeys.values():
            hotkey.remove()
        self.hotkeys = {}
        self.armed = False
        self._stop_notice()

    def settings_changed(self, changed):
        if not self.enabled():
            self.stop()
        elif self.armed:
            self._install()
        elif self.in_started_battle():
            self._arm()

    def _arm(self):
        self.armed = True
        self._install()

    def _install(self):
        for choice, option in wanted_toggles(self.settings):
            hotkey = self.hotkeys.get(option) or _option_hotkey(option, self.toggle)
            self.hotkeys[option] = hotkey
            hotkey.set(choice)

    @safe
    def toggle(self, option):
        if not self.armed:
            return

        current = (read_settings([option]) or {}).get(option)
        value = None
        if current is not None and apply_settings({option: toggled(current)}):
            value = toggled(current)
            log('battle hotkeys: %s %s' % (option, 'on' if value else 'off'))

        if self.running:
            self._notice(option, value)

    def _notice(self, option, value):
        translate = self.app.translate
        self.show(notice_text(option, value, self.settings, translate), notice_widget(option, value, translate))
        self._stop_notice()
        self.ticker = Ticker(self.settings.get('notice_s'), self._expire)
        self.ticker.start()

    def _stop_notice(self):
        if self.ticker is not None:
            self.ticker.stop()
            self.ticker = None

    def _expire(self):
        self.hide()
        return False
