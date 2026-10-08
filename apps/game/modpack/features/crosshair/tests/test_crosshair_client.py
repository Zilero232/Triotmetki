from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EVENT_COMPONENT_SETTINGS, EventBus
from otmetki.core.hud.stock import RETICLE_CASSETTE, RETICLE_CENTRE, RETICLE_RELOAD_TIMER, RETICLE_ZOOM
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.crosshair.model.readouts import Readouts
from otmetki.features.crosshair.settings import PANEL_ID

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.crosshair.client')
WRITERS = ('otmetki.core.client.native.component', 'otmetki.features.crosshair.client')


class Config(object):

    def is_enabled(self, switch):
        return True


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator({'ru': {}, 'en': {}})
        self.config = Config()
        self.in_battle = False
        self.state = {}
        self.config_dir = '.'

    def register_state(self, key, dump):
        pass

    def register_account_state(self, key, dump, load):
        pass

    def save_state(self):
        pass


ARCADE, SNIPER, STRATEGIC, POSTMORTEM = 1, 2, 3, 4


class Crosshair(object):

    def getScaledPosition(self):
        return (960, 540)

    def getSize(self):
        return (1920, 1080)

    def getScaleFactor(self):
        return 1.0

    def getZoomFactor(self):
        return 8.0


class Clip(object):
    size = 6


class Shell(object):
    kind = 'ARMOR_PIERCING_CR'
    isGold = True


class GunSettings(object):
    clip = Clip()

    def getShellDescriptor(self, intCD):
        return Shell() if intCD == 101 else None

    def hasAutoReload(self):
        return False

    def getClipInterval(self):
        return 2.5

    def getLastAmmoCount(self):
        return 1


class Ammo(object):

    def getGunSettings(self):
        return GunSettings()

    def getCurrentShells(self):
        return (30, 4)

    def getCurrentShellCD(self):
        return 101

    def getShellChangeTime(self):
        return 24.6


class RecordingGunSettings(GunSettings):

    def __init__(self):
        self.asked = []

    def getShellDescriptor(self, intCD):
        self.asked.append(intCD)
        return GunSettings.getShellDescriptor(self, intCD)


class NoShellAmmo(Ammo):

    def __init__(self, settings):
        self.settings = settings

    def getGunSettings(self):
        return self.settings

    def getCurrentShellCD(self):
        return None


class ShellAmmo(NoShellAmmo):

    def getCurrentShellCD(self):
        return 101


class AutoReloadSettings(GunSettings):

    def hasAutoReload(self):
        return True


class AutoReloadAmmo(Ammo):

    def getGunSettings(self):
        return AutoReloadSettings()


class UnknownShellsAmmo(Ammo):

    def getCurrentShells(self):
        return (-1, -1)

    def getCurrentShellCD(self):
        return None


class Layer(object):

    def __init__(self):
        self.shown = {}
        self.draws = True

    def show(self, panel_id, text, widget=None):
        self.shown[panel_id] = widget
        return self.draws

    def hide(self, panel_id):
        self.shown.pop(panel_id, None)

    def place(self, panel_id, x, y):
        return True


class Stock(object):

    def __init__(self):
        self.wanted = {}
        self.page = None

    def want(self, owner, aliases, while_hidden=False):
        self.wanted[owner] = tuple(aliases)


def forget_client():
    _support.forget_modules(CLIENT_PREFIXES)


class CrosshairNativeTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        forget_client()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        hud = importlib.import_module('otmetki.core.client.hud')
        self.saved_config = hud._state['config']
        self.config = ComponentConfig(MemoryFile())
        hud._state['config'] = self.config
        self.hud = hud
        module = importlib.import_module('otmetki.features.crosshair.client')
        self.writes = []
        for name in WRITERS:
            writer = importlib.import_module(name)
            if hasattr(writer, 'apply_changed'):
                writer.apply_changed = lambda values: self.writes.append(dict(values)) or True
        self.app = App()
        self.component = module.CrosshairComponent(self.app)
        self.config.update(PANEL_ID, {'preset': 'minimal'})
        self.app.bus.emit('hangar')
        del self.writes[:]

    def tearDown(self):
        self.hud._state['config'] = self.saved_config
        forget_client()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def change(self, **values):
        changed = self.config.update(PANEL_ID, values)
        self.app.bus.emit(EVENT_COMPONENT_SETTINGS, PANEL_ID, changed)

    def test_a_change_in_the_hangar_writes_only_the_client_setting_it_moves(self):
        self.change(server_reticle='on')

        assert self.writes == [{'useServerAim': True}]

    def test_a_change_in_battle_is_written_on_the_next_hangar(self):
        self.app.in_battle = True
        self.change(server_reticle='on')
        self.app.in_battle = False

        self.app.bus.emit('hangar')

        assert self.writes == [{'useServerAim': True}]


class CrosshairStockTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        forget_client()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        hud = importlib.import_module('otmetki.core.client.hud')
        self.saved_config = hud._state['config']
        self.config = ComponentConfig(MemoryFile())
        hud._state['config'] = self.config
        self.hud = hud
        self.module = importlib.import_module('otmetki.features.crosshair.client')
        self.module.crosshair = Crosshair
        self.module.controls_own_vehicle = lambda: True
        self.component = self.module.CrosshairComponent(App())
        self.layer = Layer()
        self.stock = Stock()
        self.component.hud = self.layer
        self.component.stock = self.stock
        self.component.running = True
        self.component.view = ARCADE
        self.component.readouts = Readouts()

    def tearDown(self):
        self.hud._state['config'] = self.saved_config
        forget_client()
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved

    def hidden(self):
        return self.stock.wanted.get(PANEL_ID, ())

    def drawn_readouts(self):
        widget = self.layer.shown.get(PANEL_ID)
        return widget and widget['data']['readouts']

    def is_empty(self):
        data = self.layer.shown[PANEL_ID]['data']
        return (data['readouts'], data['shape'], data['mark']) == (None, None, None)

    def reload(self, left=3.0, base=7.6):
        self.component.readouts.set_reload(left, base)
        self.component.render()

    def test_the_stock_reload_timer_stays_until_the_client_tells_the_reload(self):
        self.component.render()

        assert self.hidden() == ()

    def test_the_stock_reload_timer_goes_while_the_box_is_drawn(self):
        self.reload()

        assert self.drawn_readouts()['reload']['value'] == '3.0'
        assert self.hidden() == (RETICLE_RELOAD_TIMER,)

    def test_a_loaded_gun_keeps_the_box_and_its_full_reload_time(self):
        self.reload(0.0, 7.6)

        assert self.drawn_readouts()['reload']['value'] == '7.6'
        assert self.hidden() == (RETICLE_RELOAD_TIMER,)

    def test_the_stock_reload_timer_comes_back_when_the_box_is_switched_off(self):
        self.reload()
        self.config.update(PANEL_ID, {'reload_box': False})

        self.component.render()

        assert self.hidden() == ()

    def test_the_stock_reload_timer_stays_when_the_page_does_not_take_the_panel(self):
        self.layer.draws = False

        self.reload()

        assert self.hidden() == ()

    def test_the_box_is_drawn_in_the_sniper_and_the_strategic_views(self):
        for view in (SNIPER, STRATEGIC):
            self.component.view = view
            self.reload()

            assert self.drawn_readouts()['reload'] is not None, view
            assert self.hidden() == (RETICLE_RELOAD_TIMER,), view

    def test_the_strategic_view_draws_the_box_without_the_centre_mark(self):
        self.config.update(PANEL_ID, {'mark': 'chevron'})
        self.component.view = STRATEGIC

        self.reload()

        assert self.layer.shown[PANEL_ID]['data']['shape'] is None

    def test_the_stock_reload_timer_comes_back_off_the_own_reticle(self):
        self.reload()
        self.component.view = POSTMORTEM

        self.component.render()

        assert self.is_empty()
        assert self.hidden() == ()

    def test_the_game_centre_is_hidden_while_the_mark_is_drawn(self):
        self.config.update(PANEL_ID, {'mark': 'chevron', 'reload_box': False})

        self.component.render()

        assert self.hidden() == (RETICLE_CENTRE,)

    def test_the_game_centre_comes_back_where_the_mark_is_not_drawn(self):
        self.config.update(PANEL_ID, {'mark': 'chevron', 'reload_box': False, 'modes': 'sniper'})

        self.component.render()

        assert self.hidden() == ()

    def test_the_game_centre_stays_when_the_page_does_not_take_the_panel(self):
        self.config.update(PANEL_ID, {'mark': 'chevron', 'reload_box': False})
        self.layer.draws = False

        self.component.render()

        assert self.hidden() == ()

    def test_nothing_is_sent_before_anything_was_drawn(self):
        self.component.view = POSTMORTEM

        self.component.render()

        assert self.layer.shown == {}

    def test_an_empty_panel_is_sent_once(self):
        self.reload()
        self.component.view = POSTMORTEM
        self.component.render()
        self.layer.shown.clear()

        self.component.render()

        assert self.layer.shown == {}

    def test_the_stock_reload_timer_comes_back_while_an_ally_is_followed(self):
        self.reload()
        self.module.controls_own_vehicle = lambda: False

        self.component.render()

        assert self.hidden() == ()

    def test_the_drum_goes_with_the_current_shell_and_hides_the_stock_magazine(self):
        self.module.ammo = Ammo
        self.component._on_clip()

        self.reload(1.8, 2.5)

        clip = self.drawn_readouts()['reload']['clip']
        assert (clip['size'], clip['loaded'], clip['shell'], clip['gold']) == (6, 4, 'apcr', True)
        assert self.drawn_readouts()['reload']['full'] == '24.6'
        assert self.hidden() == (RETICLE_RELOAD_TIMER, RETICLE_CASSETTE)

    def test_a_loaded_drum_shows_the_clients_interval_over_the_drum_reload(self):
        self.module.ammo = Ammo
        self.component._on_clip()

        self.reload(0.0, 24.6)

        assert (self.drawn_readouts()['reload']['value'], self.drawn_readouts()['reload']['full']) == ('2.5', '24.6')

    def test_no_current_shell_never_asks_the_client_for_a_descriptor(self):
        settings = RecordingGunSettings()
        self.module.ammo = lambda: NoShellAmmo(settings)

        size, _, shell, gold = self.module.own_clip()

        assert settings.asked == []
        assert (size, shell, gold) == (6, None, False)

    def test_the_current_shell_names_its_descriptor(self):
        settings = RecordingGunSettings()
        self.module.ammo = lambda: ShellAmmo(settings)

        assert self.module.own_clip()[3] is True
        assert settings.asked == [101]

    def test_the_stock_magazine_stays_with_the_drum_off(self):
        self.module.ammo = Ammo
        self.config.update(PANEL_ID, {'drum_style': 'off'})
        self.component._on_clip()

        self.reload(1.8, 2.5)

        assert self.hidden() == (RETICLE_RELOAD_TIMER,)

    def test_an_auto_reloader_with_the_drum_off_still_hides_the_stock_magazine_timer(self):
        self.module.ammo = AutoReloadAmmo
        self.config.update(PANEL_ID, {'drum_style': 'off'})
        self.component._on_clip()

        self.reload(1.8, 2.5)

        assert self.hidden() == (RETICLE_RELOAD_TIMER, RETICLE_CASSETTE)

    def test_an_auto_reloader_with_the_drum_off_draws_the_magazine_as_shells(self):
        self.module.ammo = AutoReloadAmmo
        self.config.update(PANEL_ID, {'drum_style': 'off'})
        self.component._on_clip()

        self.reload(1.8, 2.5)

        assert self.drawn_readouts()['reload']['clip']['style'] == 'shells'

    def test_an_unknown_shell_count_keeps_the_drawn_magazine(self):
        self.module.ammo = Ammo
        self.component._on_clip()
        self.reload(1.8, 2.5)
        self.module.ammo = UnknownShellsAmmo

        self.component._on_clip()
        self.component.render()

        assert self.drawn_readouts()['reload']['clip']['loaded'] == 4

    def test_the_zoom_is_drawn_in_the_sniper_view_only(self):
        self.config.update(PANEL_ID, {'reload_box': False, 'show_zoom': True})

        self.component._on_view(SNIPER)

        assert self.drawn_readouts()['zoom'] == '8.0'
        assert self.hidden() == (RETICLE_ZOOM,)

        self.component._on_view(ARCADE)

        assert self.is_empty()
        assert self.hidden() == ()

    def test_a_zoom_change_redraws_the_multiplier(self):
        self.config.update(PANEL_ID, {'show_zoom': True})
        self.component._on_view(SNIPER)

        self.component._on_zoom(16.0)

        assert self.drawn_readouts()['zoom'] == '16.0'


if __name__ == '__main__':
    unittest.main()
