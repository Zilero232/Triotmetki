# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

STUBBED = ('BigWorld',)
CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.hangar_space.client')
MAIN_PATH = 'spaces/h08_mt_hangar'
MUSEUM_PATH = 'spaces/h16_mt_museum'
EVENT_PATH = 'spaces/h40_event'
ENVIRONMENTS = {
    'h08_mt_hangar': (['h08_mt_hangar_Autumn_TD2', 'h08_mt_hangar_Autumn_TD3', 'Customization'],
                      'h08_mt_hangar_Autumn_TD2'),
    'h16_mt_museum': (['RexpTM'], 'RexpTM'),
}


class DefaultConfig(object):
    # RU 1.45 gui/game_control/hangar_switch_controller.py DefaultHangarSpaceConfig, the slots the feature writes.

    def __init__(self):
        self._spaceIdOverride = {}
        self._environment = {True: '', False: ''}

    def getHangarSpaceId(self, isPremium):
        return self._spaceIdOverride.get(isPremium) or MAIN_PATH

    def setSpaceIdOverride(self, isPremium, newId):
        self._spaceIdOverride[isPremium] = newId

    def discardSpaceIdOverride(self, isPremium):
        self._spaceIdOverride[isPremium] = None

    def getEnvironment(self, isPremium):
        return self._environment[isPremium]

    def setEnvironment(self, isPremium, newEnvironment):
        self._environment[isPremium] = newEnvironment

    def discardEnvironment(self, isPremium):
        self._environment[isPremium] = ''


class Switcher(object):

    currentSceneName = 'DEFAULT'

    def __init__(self):
        self._defaultHangarSpaceConfig = DefaultConfig()
        self.reloads = 0

    def processPossibleSceneChange(self):
        self.reloads += 1


class Hangar(object):

    spaceInited = True
    isPremium = False

    def __init__(self, path):
        self.spacePath = path

    @staticmethod
    def spaceLoading():
        return False


class App(object):

    in_battle = False


class Settings(object):

    def __init__(self, values):
        self.values = values

    def get(self, key):
        return self.values[key]


def stub_client():
    big_world = types.ModuleType(str('BigWorld'))
    big_world.callback = lambda delay, callback: None
    sys.modules['BigWorld'] = big_world


class ApplyTest(unittest.TestCase):

    def setUp(self):
        self.saved = dict((name, sys.modules.get(name)) for name in STUBBED)
        _support.forget_modules(CLIENT_PREFIXES)
        stub_client()
        client = importlib.import_module('otmetki.features.hangar_space.client')
        self.switcher = Switcher()
        self.hangar = Hangar(MAIN_PATH)
        self.switched = []
        client.controller = lambda: self.switcher
        client.hangar_space = lambda: self.hangar
        client.available_paths = lambda: [MAIN_PATH, MUSEUM_PATH]
        client.is_default_scene = lambda switcher: True
        client.environment_names = lambda names: dict((name, ENVIRONMENTS[name][0]) for name in names)
        client.active_environment = lambda path: ENVIRONMENTS[path.split('/')[1]][1]
        client.switch_environment = self.switched.append
        self.component = client.HangarSpace.__new__(client.HangarSpace)
        self.component.app = App()
        self.component.owned = None
        self.component.owned_environment = u''
        self.component.waiting = False
        self.component.environment_pending = False
        self.component.missing_looks = set()
        self.component.enabled = lambda: True
        self.choose(u'', u'')

    def tearDown(self):
        _support.forget_modules(CLIENT_PREFIXES)
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def choose(self, space, look):
        self.component.settings = Settings({'space': space, 'look': look})

    def config(self):
        return self.switcher._defaultHangarSpaceConfig

    def test_a_look_of_the_loaded_space_switches_live_without_a_reload(self):
        self.choose(u'', 'autumn_rain')

        self.component.apply(force=True)

        assert self.switched == ['h08_mt_hangar_Autumn_TD3']
        assert self.switcher.reloads == 0

    def test_a_look_fills_both_environment_slots_of_its_space(self):
        self.choose(u'', 'studio')

        self.component.apply(force=True)

        assert self.config()._environment == {True: 'Customization', False: 'Customization'}

    def test_a_look_is_switched_once_when_the_settings_apply_twice(self):
        self.choose(u'', 'studio')

        self.component.apply(force=True)
        self.component.apply(force=True)

        assert self.switched == ['Customization']

    def test_the_game_look_switches_back_to_the_space_active_environment(self):
        self.choose(u'', 'studio')
        self.component.apply(force=True)
        self.choose(u'', u'')

        self.component.apply(force=True)

        assert self.switched == ['Customization', 'h08_mt_hangar_Autumn_TD2']
        assert self.config()._environment == {True: '', False: ''}

    def test_a_look_of_another_space_reloads_with_the_environment_in_the_slot(self):
        self.hangar = Hangar(MUSEUM_PATH)
        self.choose(u'', 'autumn_rain')

        self.component.apply(force=True)

        assert self.switcher.reloads == 1
        assert self.switched == []
        assert self.config()._environment[False] == 'h08_mt_hangar_Autumn_TD3'

    def test_an_event_environment_of_the_server_stays(self):
        self.config().setEnvironment(True, 'Event')
        self.choose(u'', 'autumn_rain')

        self.component.apply(force=True)

        assert self.config()._environment == {True: 'Event', False: 'h08_mt_hangar_Autumn_TD3'}

    def test_an_event_hangar_in_a_slot_gets_no_environment_of_ours(self):
        self.config().setSpaceIdOverride(True, EVENT_PATH)
        self.choose(u'', 'autumn_rain')

        self.component.apply(force=True)

        assert self.config()._environment[True] == ''

    def test_a_look_the_client_lacks_leaves_the_chosen_space(self):
        self.choose('h16_mt_museum', 'otm_gone')

        self.component.apply(force=True)

        assert self.config()._spaceIdOverride == {True: MUSEUM_PATH, False: MUSEUM_PATH}
        assert self.switched == []


if __name__ == '__main__':
    unittest.main()
