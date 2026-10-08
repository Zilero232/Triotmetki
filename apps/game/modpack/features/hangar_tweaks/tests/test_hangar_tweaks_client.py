from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EVENT_COMPONENT_SETTINGS, EventBus
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.hangar_tweaks.i18n import STRINGS

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.hangar_tweaks.client')
STUBBED = ('BigWorld',)


class Config(object):

    def __init__(self):
        self.on = True

    def is_enabled(self, switch):
        return self.on


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS, 'en')
        self.config = Config()
        self.in_battle = False
        self.account_id = None


class Device(object):

    def __init__(self, int_cd, is_removable=True):
        self.intCD = int_cd
        self.isRemovable = is_removable


class DemountClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        _support.forget_modules(CLIENT_PREFIXES)
        for name in STUBBED:
            sys.modules[name] = types.ModuleType(str(name))
        self.processors = importlib.import_module('otmetki.features.hangar_tweaks.client.processors')
        self.slots = {}
        self.steps = []
        self.processors.fresh_vehicle = lambda vehicle: vehicle
        self.processors.run_in_order = lambda steps, done, context: self.steps.extend(steps)
        self.processors._installer = lambda vehicle, device, slot: ('demount', slot)

    def tearDown(self):
        for name, saved in self.saved.items():
            if saved is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = saved
        _support.forget_modules(CLIENT_PREFIXES)

    def device_in(self, vehicle, slot):
        return self.slots.get(slot)

    def planned_step(self):
        planned = [{'slot': 0, 'removable': True, 'int_cd': 101}]
        self.processors.demount(object(), planned, self.device_in, lambda success: None)
        return self.steps[0]

    def test_the_planned_device_is_demounted(self):
        self.slots[0] = Device(101)

        assert self.planned_step()() == ('demount', 0)

    def test_a_device_swapped_in_meanwhile_is_left(self):
        self.slots[0] = Device(202)

        assert self.planned_step()() is None

    def test_a_device_no_longer_removable_is_left(self):
        self.slots[0] = Device(101, is_removable=False)

        assert self.planned_step()() is None


class HangarTweaksClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        self.purge()
        for name in STUBBED:
            sys.modules[name] = types.ModuleType(str(name))
        hud = importlib.import_module('otmetki.core.client.hud')
        self.config = ComponentConfig(MemoryFile())
        hud._state.update({'config': self.config})
        module = importlib.import_module('otmetki.features.hangar_tweaks.client')
        self.writes = []
        native = importlib.import_module('otmetki.core.client.native.component')
        native.apply_changed = self.record_write
        self.app = App()
        self.component = module.HangarTweaks(self.app)
        self.app.bus.emit('hangar')

    def tearDown(self):
        for name, saved in self.saved.items():
            if saved is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = saved
        self.purge()

    @staticmethod
    def purge():
        _support.forget_modules(CLIENT_PREFIXES)

    def record_write(self, values):
        self.writes.append(dict(values))
        return True

    def change(self, values):
        changed = self.config.update('hangar_tweaks', values)
        self.app.bus.emit(EVENT_COMPONENT_SETTINGS, 'hangar_tweaks', changed)

    def test_a_carousel_change_in_the_hangar_writes_the_game_setting(self):
        self.change({'carousel_rows': '1'})

        assert self.writes == [{'carouselType': 0}]

    def test_the_hangar_alone_writes_nothing(self):
        self.app.bus.emit('hangar')

        assert self.writes == []

    def test_a_change_in_battle_waits_for_the_hangar(self):
        self.app.in_battle = True
        self.change({'carousel_rows': '1'})

        self.app.in_battle = False
        self.app.bus.emit('hangar')

        assert self.writes == [{'carouselType': 0}]

    def test_the_exact_scale_option_is_gone(self):
        assert 'interface_scale_exact' not in self.component.settings.to_dict()


if __name__ == '__main__':
    unittest.main()
