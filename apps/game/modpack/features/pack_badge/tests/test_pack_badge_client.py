from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.codec import parse_json_body

CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.pack_badge.client')
LIBRARIES_MODULE = 'gui.Scaleform.required_libraries_config'
OWN_VEHICLE = 7
OWN_ACCOUNT = 3500
API = 'https://api.example'


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


def arena_account(player):
    return OWN_ACCOUNT if player.playerVehicleID == OWN_VEHICLE else None


class Bridge(object):

    def __init__(self):
        self.started = False
        self.shown = None

    def start(self):
        self.started = True

    def stop(self):
        self.started = False

    def show(self, vehicle_ids, reason):
        self.shown = (vehicle_ids, reason)


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


def arena_info(vehicle_id, account_id, is_bot=False):
    player = Namespace(accountDBID=account_id, name='Tanker%d' % account_id, fakeName='', isEventBot=is_bot)
    return Namespace(vehicleID=vehicle_id, player=player)


class Config(dict):

    def endpoint(self, path):
        return API + path


class OwnBadgeTest(ClientTestCase):

    def setUp(self):
        ClientTestCase.setUp(self)
        self.module.own_account_id = arena_account
        self.infos = [arena_info(OWN_VEHICLE, OWN_ACCOUNT), arena_info(8, 21), arena_info(9, 22, is_bot=True)]
        self.module.arena_infos = lambda: self.infos
        self.player = Namespace(playerVehicleID=OWN_VEHICLE, arenaUniqueID=42)
        self.transport = _support.FakeTransport()

    def component(self, config, is_enabled=True):
        component = self.module.PackBadge.__new__(self.module.PackBadge)
        component.app = Namespace(
            config=Config(config),
            transport=self.transport,
            user_agent=lambda: 'ua',
            is_bound=lambda: False,
            auth_failed=False,
        )
        component.enabled = lambda: is_enabled
        component.badges = self.module.BattleBadges()
        component.hooks = Namespace(add=lambda *args: None, clear=lambda: None)
        component.bridge = Bridge()
        return component

    def sent(self):
        return [(request['url'], parse_json_body(request['body'])) for request in self.transport.requests]

    def test_an_unbound_install_marks_its_own_row(self):
        component = self.component({'enabled': True, 'show_pack_badge': True})

        component._on_battle_ready(self.player)

        assert component.badges.marked == frozenset([OWN_ACCOUNT])

    def test_an_unbound_install_asks_who_has_the_mod(self):
        component = self.component({'enabled': True, 'show_pack_badge': True})

        component._on_battle_ready(self.player)

        assert self.sent() == [(API + '/mod/badges/presence', {
            'account_id': OWN_ACCOUNT, 'visible': True, 'account_ids': [21],
        })]

    def test_the_request_is_unsigned(self):
        component = self.component({'enabled': True, 'show_pack_badge': True})

        component._on_battle_ready(self.player)

        headers = self.transport.requests[0]['headers']
        assert not [name for name in headers if name.lower().startswith('x-otmetki')]

    def test_the_own_badge_switched_off_is_sent_as_not_visible_and_marks_nothing(self):
        component = self.component({'enabled': True, 'show_pack_badge': False})

        component._on_battle_ready(self.player)

        assert component.badges.marked == frozenset()
        assert self.sent()[0][1]['visible'] is False

    def test_the_answer_marks_the_players_with_the_mod(self):
        component = self.component({'enabled': True, 'show_pack_badge': True})
        component._on_battle_ready(self.player)

        self.transport.respond(200, b'{"account_ids":[21]}')

        assert component.badges.marked == frozenset([OWN_ACCOUNT, 21])
        assert component.bridge.shown == ([OWN_VEHICLE, 8], 'site answer')

    def test_a_vehicle_added_later_asks_only_about_its_player(self):
        component = self.component({'enabled': True, 'show_pack_badge': True})
        component._on_battle_ready(self.player)
        self.infos.append(arena_info(10, 23))

        component._on_vehicle_added(42)

        assert self.sent()[1][1]['account_ids'] == [23]

    def test_a_vehicle_added_with_no_new_player_sends_nothing(self):
        component = self.component({'enabled': True, 'show_pack_badge': True})
        component._on_battle_ready(self.player)

        component._on_vehicle_added(42)

        assert len(self.transport.requests) == 1

    def test_the_battle_drawing_switched_off_sends_nothing_and_never_touches_the_page(self):
        component = self.component({'enabled': True, 'show_pack_badge': True}, is_enabled=False)

        component._on_battle_ready(self.player)

        assert component.bridge.started is False
        assert self.transport.requests == []


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
