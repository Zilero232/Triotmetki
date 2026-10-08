from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.component import FeatureComponent
from ....core.client.hotkey import HotkeyChoice
from ....core.client.hud import hud_layer
from ....core.hooks import is_restorable, override, restore, subscribe
from ....core.log import log, log_exception, safe
from ..i18n import STRINGS
from ..model import PLACE_HANGAR, PLACE_REPLAY, START, STOP, Flight, flight_place
from ..model.constants import HOTKEYS
from ..settings import SCHEMA, SECTION, SWITCH
from .constants import ACCOUNT_LEFT_EVENTS, ESCAPE_KEY
from .flights import HangarFlight, ReplayFlight, set_lobby_gui, toggle_battle_gui


def _game_module():
    try:
        import game
    except ImportError:
        log('free camera: the client input module is missing, the camera keys stay with the client')
        return None
    return game


def _player_events():
    try:
        from PlayerEvents import g_playerEvents
    except ImportError:
        log('free camera: the client player events are missing, a flight lands on the next hangar')
        return None
    return g_playerEvents


def _is_replay():
    try:
        import BattleReplay
        return bool(BattleReplay.isPlaying())
    except Exception:
        return False


class FreeCamera(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.flight = Flight()
        self.flights = {PLACE_HANGAR: HangarFlight(), PLACE_REPLAY: ReplayFlight()}
        self.hotkey = HotkeyChoice(HOTKEYS, self._on_hotkey)
        self.hotkey_choice = None
        self.muted = None
        self.input_hooked = False
        self._install_hotkey()
        self._watch_account()
        bus = app.bus
        bus.on('hangar', self._on_hangar)
        bus.on('battle_enter', self._on_battle_enter)
        bus.on('battle_leave', self._on_battle_leave)

    def _watch_account(self):
        events = _player_events()
        if events is None:
            return
        for name in ACCOUNT_LEFT_EVENTS:
            if hasattr(events, name):
                subscribe(events, name, self._on_account_left)

    def settings_changed(self, changed):
        self._install_hotkey()
        if self.flight.active and not self.enabled():
            self.stop()

    def _hook_input(self):
        game = _game_module()
        if self.input_hooked or game is None:
            return
        override(game, 'handleKeyEvent')(self._handle_key)
        override(game, 'handleMouseEvent')(self._handle_mouse)
        self.input_hooked = True

    def _unhook_input(self):
        game = _game_module()
        if not self.input_hooked or game is None:
            return
        if is_restorable(game, 'handleKeyEvent') and is_restorable(game, 'handleMouseEvent'):
            restore(game, 'handleKeyEvent')
            restore(game, 'handleMouseEvent')
            self.input_hooked = False

    def _install_hotkey(self):
        choice = self.settings.get('hotkey') if self.enabled() else 'none'
        if choice != self.hotkey_choice:
            self.hotkey_choice = choice
            self.hotkey.set(choice)

    def _on_hangar(self):
        if self.flight.place == PLACE_HANGAR:
            self.stop()
        self._install_hotkey()

    def _on_account_left(self, *args):
        if self.flight.place != PLACE_HANGAR:
            return
        self.flights[PLACE_HANGAR].drop()
        self._finish(show_gui=True)

    def _on_battle_enter(self):
        if self.flight.place == PLACE_HANGAR:
            self.flights[PLACE_HANGAR].drop()
            self._finish(show_gui=False)
        self._install_hotkey()

    def _on_battle_leave(self):
        if self.flight.place == PLACE_REPLAY:
            self._finish(show_gui=False)

    @safe
    def _on_hotkey(self):
        if not self.enabled():
            return
        place = flight_place(self.app.in_battle, _is_replay())
        action = self.flight.press(place, self.settings.to_dict())
        if action == START:
            self.start(place)
        elif action == STOP:
            self.stop()

    def start(self, place):
        self._hook_input()
        try:
            started = self.flights[place].start()
        except Exception:
            log_exception('free camera: start in the %s' % place)
            started = False
        if not started:
            self._unhook_input()
            return False
        hide_ui = bool(self.settings.get('hide_ui'))
        self.flight.started(place, hide_ui)
        if hide_ui:
            self._hide_gui(place)
        else:
            self._notify_started()
        log('free camera: flying in the %s' % place)
        return True

    @safe
    def stop(self):
        if not self.flight.active:
            return
        try:
            self.flights[self.flight.place].stop()
        finally:
            self._finish(show_gui=True)

    def _finish(self, show_gui):
        self._unhook_input()
        place, hid_ui = self.flight.stopped()
        if hid_ui:
            self._show_gui(place, show_gui)
        log('free camera: back from the %s' % place)

    def _hide_gui(self, place):
        layer = hud_layer(self.app)
        self.muted = (getattr(layer, 'muted', False), getattr(self.app.ui, 'muted', False))
        layer.set_muted(True)
        self.app.ui.set_muted(True)
        if place == PLACE_REPLAY:
            toggle_battle_gui()
        else:
            set_lobby_gui(False)

    def _show_gui(self, place, restore_client):
        if self.muted is not None:
            hud_muted, ui_muted = self.muted
            hud_layer(self.app).set_muted(hud_muted)
            self.app.ui.set_muted(ui_muted)
            self.muted = None
        if not restore_client:
            return
        if place == PLACE_REPLAY:
            toggle_battle_gui()
        else:
            set_lobby_gui(True)

    def _notify_started(self):
        if self.flight.place == PLACE_HANGAR:
            hotkey = self.app.translate('free_camera_hotkey_%s' % self.hotkey_choice)
            self.app.ui.notify(self.app.translate('free_camera_started', hotkey=hotkey))

    def _is_escape(self, event):
        import Keys
        return event.isKeyDown() and event.key == getattr(Keys, ESCAPE_KEY, None)

    def _is_toggle_key(self, event):
        import Keys
        key_name = HOTKEYS.get(self.hotkey_choice, (None, ()))[0]
        return key_name is not None and event.key == getattr(Keys, key_name, None)

    def _handle_key(self, original, event, *args, **kwargs):
        place = self.flight.place
        if place is None:
            return original(event, *args, **kwargs)
        if self._is_escape(event):
            self.stop()
            return True
        if place == PLACE_REPLAY or self._is_toggle_key(event):
            return original(event, *args, **kwargs)
        self.flights[PLACE_HANGAR].key(event.key, event.isKeyDown())
        return True

    def _handle_mouse(self, original, event, *args, **kwargs):
        if self.flight.place != PLACE_HANGAR:
            return original(event, *args, **kwargs)
        self.flights[PLACE_HANGAR].mouse(event.dx, event.dy, event.dz)
        return True
