from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from _support import MemoryFile
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.features.aim_circle.settings import SECTION, SWITCH

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.aim_circle.client')
MARKER_MODULE = 'AvatarInputHandler.gun_marker_ctrl'


class Config(object):

    def is_enabled(self, switch):
        return True


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator({'ru': {}, 'en': {}})
        self.config = Config()
        self.in_battle = False


class Provider(object):

    def __init__(self):
        self.sizes = []

    def updateSize(self, size, relax_time):
        self.sizes.append((size, relax_time))


class GunMarkerController(object):

    def __init__(self):
        self._dataProvider = Provider()

    def update(self, marker_type, pos, direction, size_vector, relax_time, coll_data):
        self._dataProvider.updateSize(80.0, relax_time)

    def getSize(self):
        return 80.0


def forget_client():
    _support.forget_modules(CLIENT_PREFIXES)


class AimCircleClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in ('BigWorld', 'AvatarInputHandler', MARKER_MODULE)}
        self.original_update = GunMarkerController.__dict__['update']
        forget_client()
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        _support.stub_parents(MARKER_MODULE)
        sys.modules[MARKER_MODULE] = types.ModuleType(str(MARKER_MODULE))
        sys.modules[MARKER_MODULE]._DefaultGunMarkerController = GunMarkerController
        hud = importlib.import_module('otmetki.core.client.hud')
        self.saved_config = hud._state['config']
        self.config = ComponentConfig(MemoryFile())
        hud._state['config'] = self.config
        self.hud = hud
        module = importlib.import_module('otmetki.features.aim_circle.client')
        self.app = App()
        self.component = module.AimCircle(self.app)
        self.controller = GunMarkerController()

    def tearDown(self):
        GunMarkerController.update = self.original_update
        self.hud._state['config'] = self.saved_config
        forget_client()
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def update(self):
        self.app.bus.emit('battle_enter')
        self.controller.update(0, None, None, (80.0, 40.0), 0.1, None)
        return self.controller._dataProvider.sizes

    def switch_circle(self, is_on):
        self.app.config.is_enabled = lambda switch: is_on if switch == SWITCH else True

    def test_the_marker_stays_the_clients_outside_a_battle(self):
        assert GunMarkerController.__dict__['update'] is self.original_update

    def test_the_marker_stays_the_clients_with_the_circle_off(self):
        self.switch_circle(False)

        self.app.bus.emit('battle_enter')

        assert GunMarkerController.__dict__['update'] is self.original_update

    def test_the_end_of_a_battle_gives_the_marker_back(self):
        self.app.bus.emit('battle_enter')

        self.app.bus.emit('battle_leave')

        assert GunMarkerController.__dict__['update'] is self.original_update

    def test_a_circle_switched_on_in_the_hangar_applies_in_the_next_battle(self):
        self.switch_circle(False)
        self.app.bus.emit('battle_enter')
        self.app.bus.emit('battle_leave')
        self.switch_circle(True)

        assert self.update()[-1] == (56.0, 0.1)

    def test_a_smaller_circle_is_drawn_at_the_chosen_share(self):
        self.config.update(SECTION, {'size': 'p60'})

        assert self.update()[-1] == (48.0, 0.1)

    def test_the_circle_starts_at_seventy_percent(self):
        assert self.update()[-1] == (56.0, 0.1)

    def test_the_client_size_goes_out_first(self):
        assert self.update()[0] == (80.0, 0.1)

    def test_the_circle_switched_off_in_battle_keeps_the_game_circle(self):
        self.app.bus.emit('battle_enter')
        self.switch_circle(False)

        assert self.update() == [(80.0, 0.1)]


if __name__ == '__main__':
    unittest.main()
