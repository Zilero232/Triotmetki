from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.pack_badge.client')
LIBRARIES_MODULE = 'gui.Scaleform.required_libraries_config'
OWN_VEHICLE = 7
OWN_ACCOUNT = 3500


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


def arena_account(player):
    return OWN_ACCOUNT if player.playerVehicleID == OWN_VEHICLE else None


class Badges(object):

    def __init__(self):
        self.started = None
        self.requested = True
        self.marked = frozenset()

    def start(self, arena_id, own_account_id):
        self.started = (arena_id, own_account_id)


class Bridge(object):

    def __init__(self):
        self.started = False
        self.shown = None

    def start(self):
        self.started = True

    def show(self, vehicle_ids):
        self.shown = vehicle_ids


class ClientTestCase(unittest.TestCase):

    def setUp(self):
        self.saved = sys.modules.get('BigWorld')
        _support.forget_modules(CLIENT_PREFIXES)
        sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
        self.module = importlib.import_module('otmetki.features.pack_badge.client')

    def tearDown(self):
        _support.forget_modules(CLIENT_PREFIXES)
        if self.saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = self.saved


class OwnBadgeTest(ClientTestCase):

    def setUp(self):
        ClientTestCase.setUp(self)
        self.module.own_account_id = arena_account
        self.player = Namespace(playerVehicleID=OWN_VEHICLE, arenaUniqueID=42)

    def component(self, config, is_enabled=True):
        component = self.module.PackBadge.__new__(self.module.PackBadge)
        component.app = Namespace(config=config, is_bound=lambda: False, auth_failed=False)
        component.enabled = lambda: is_enabled
        component.badges = Badges()
        component.hooks = Namespace(add=lambda *args: None)
        component.bridge = Bridge()
        component.request = lambda arena_id: None
        return component

    def test_an_unbound_install_marks_its_own_row(self):
        component = self.component({'enabled': True, 'show_pack_badge': True})

        component._on_battle_ready(self.player)

        assert component.badges.started == (42, OWN_ACCOUNT)

    def test_the_own_badge_switched_off_marks_nothing(self):
        component = self.component({'enabled': True, 'show_pack_badge': False})

        component._on_battle_ready(self.player)

        assert component.badges.started == (42, None)

    def test_the_battle_drawing_switched_off_never_touches_the_page(self):
        component = self.component({'enabled': True, 'show_pack_badge': True}, is_enabled=False)

        component._on_battle_ready(self.player)

        assert component.bridge.started is False


class LibraryTest(ClientTestCase):

    def setUp(self):
        ClientTestCase.setUp(self)
        self.added = _support.stub_parents(LIBRARIES_MODULE)
        self.libraries = types.ModuleType(str(LIBRARIES_MODULE))
        self.libraries.BATTLE_REQUIRED_LIBRARIES = ['windows.swf']
        sys.modules[LIBRARIES_MODULE] = self.libraries
        self.flash = importlib.import_module('otmetki.features.pack_badge.client.flash')

    def tearDown(self):
        _support.drop_modules([LIBRARIES_MODULE] + self.added)
        ClientTestCase.tearDown(self)

    def test_the_switch_on_loads_the_library_with_the_battle_app(self):
        self.flash.set_library(True)

        assert self.libraries.BATTLE_REQUIRED_LIBRARIES == ['windows.swf', 'otmetki_pack_badge.swf']

    def test_the_switch_off_takes_it_out_again(self):
        self.flash.set_library(True)

        self.flash.set_library(False)

        assert self.libraries.BATTLE_REQUIRED_LIBRARIES == ['windows.swf']


if __name__ == '__main__':
    unittest.main()
