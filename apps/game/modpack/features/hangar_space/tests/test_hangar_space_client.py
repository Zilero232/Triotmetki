# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import io
import os
import shutil
import struct
import sys
import tempfile
import types
import unittest

import _support

STUBBED = ('BigWorld',)
CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.hangar_space.client')
MAIN_PATH = 'spaces/h08_mt_hangar'
MUSEUM_PATH = 'spaces/h16_mt_museum'
MUSEUM = 'h16_mt_museum'
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
    config_dir = None

    @staticmethod
    def translate(key, **params):
        return key


class Store(object):
    # core.client.hud.component_config: update() merges into the component's settings section.

    def __init__(self, component):
        self.component = component

    def update(self, component_id, values):
        self.component.settings.values.update(values)
        return sorted(values)


class Settings(object):

    def __init__(self, values):
        self.values = values

    def get(self, key):
        return self.values[key]


def stub_client():
    big_world = types.ModuleType(str('BigWorld'))
    big_world.callback = lambda delay, callback: None
    sys.modules['BigWorld'] = big_world
    return big_world


class ClientCase(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        _support.forget_modules(CLIENT_PREFIXES)
        self.big_world = stub_client()
        client = importlib.import_module('otmetki.features.hangar_space.client')
        self.client = client
        self.folder = tempfile.mkdtemp()
        self.switcher = Switcher()
        self.hangar = Hangar(MAIN_PATH)
        self.switched = []
        self.logged = []
        self.stub_glue(client)
        self.component = self.make_component(client)
        self.choose(u'', u'')

    def stub_glue(self, client):
        client.controller = lambda: self.switcher
        client.hangar_space = lambda: self.hangar
        client.available_paths = lambda: [MAIN_PATH, MUSEUM_PATH]
        client.is_default_scene = lambda switcher: True
        client.environment_names = lambda names: {name: ENVIRONMENTS[name][0] for name in names}
        client.active_environment = lambda path: ENVIRONMENTS[path.split('/')[1]][1]
        client.switch_environment = self.switched.append
        client.default_path = lambda: MAIN_PATH
        client.log = self.logged.append
        client.component_config = lambda app: Store(self.component)

    def make_component(self, client):
        component = client.HangarSpace.__new__(client.HangarSpace)
        component.app = App()
        component.component_id = 'hangar_space'
        component.owned = None
        component.owned_environment = u''
        component.kept_spaces = {}
        component.kept_environments = {}
        component.waiting = False
        component.environment_pending = False
        component.missing_looks = set()
        component.enabled = lambda: True
        component.previews = client.PreviewStore(os.path.join(self.folder, 'hangar_previews'))
        component.capture_book = client.CaptureBook()
        component.shot = client.SceneShot(component.previews, component._preview_done)
        component.preview_ticker = client.Ticker(0.5, component._check_preview)
        return component

    def tearDown(self):
        shutil.rmtree(self.folder, ignore_errors=True)
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


class WaitTest(ClientCase):

    def setUp(self):
        ClientCase.setUp(self)
        self.waits = []
        self.cancelled = []
        self.client.once_space_created = self.wait

    def wait(self, hangar, handler):
        self.waits.append(hangar)
        return lambda: self.cancelled.append(hangar)

    def test_a_space_still_loading_is_waited_for_once(self):
        self.component._follow(self.switcher, self.hangar, self.client.PLAN_WAIT)
        self.component._follow(self.switcher, self.hangar, self.client.PLAN_WAIT)

        assert self.waits == [self.hangar]

    def test_a_battle_entered_while_waiting_drops_the_wait(self):
        self.component._follow(self.switcher, self.hangar, self.client.PLAN_WAIT)

        self.component._stop_waiting()

        assert self.cancelled == [self.hangar]

    def test_the_next_hangar_after_a_battle_waits_again(self):
        self.component._follow(self.switcher, self.hangar, self.client.PLAN_WAIT)
        self.component._stop_waiting()
        next_hangar = Hangar(MAIN_PATH)

        self.component._follow(self.switcher, next_hangar, self.client.PLAN_WAIT)

        assert self.waits == [self.hangar, next_hangar]


class ApplyTest(ClientCase):

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

    def test_a_pick_logs_one_line_with_the_wish_the_slots_and_the_plan(self):
        self.choose(u'', 'autumn_rain')

        self.component.apply(force=True)

        assert len(self.logged) == 1
        assert 'spaces/h08_mt_hangar / h08_mt_hangar_Autumn_TD3' in self.logged[0]
        assert self.logged[0].endswith(': loaded')

    def test_a_server_slot_naming_the_default_hangar_gives_way_to_a_chosen_space(self):
        self.config().setSpaceIdOverride(False, 'h08_mt_hangar')
        self.config().setEnvironment(False, 'h08_mt_hangar_Autumn_TD2')
        self.choose('h16_mt_museum', u'')

        self.component.apply(force=True)

        assert self.config()._spaceIdOverride == {True: MUSEUM_PATH, False: MUSEUM_PATH}
        assert self.config()._environment[False] == ''
        assert self.switcher.reloads == 1

    def test_the_game_hangar_puts_the_server_slot_back(self):
        self.config().setSpaceIdOverride(False, 'h08_mt_hangar')
        self.config().setEnvironment(False, 'h08_mt_hangar_Autumn_TD2')
        self.choose('h16_mt_museum', u'')
        self.component.apply(force=True)
        self.choose(u'', u'')

        self.component.apply(force=True)

        assert self.config()._spaceIdOverride == {True: None, False: 'h08_mt_hangar'}
        assert self.config()._environment[False] == 'h08_mt_hangar_Autumn_TD2'

    def test_a_look_takes_the_environment_of_a_server_slot_of_the_default_hangar(self):
        self.config().setSpaceIdOverride(False, MAIN_PATH)
        self.config().setEnvironment(False, 'h08_mt_hangar_Autumn_TD2')
        self.choose(u'', 'autumn_rain')

        self.component.apply(force=True)

        assert self.config()._environment[False] == 'h08_mt_hangar_Autumn_TD3'
        assert self.switched == ['h08_mt_hangar_Autumn_TD3']

    def test_an_event_hangar_stays_and_the_pick_says_so(self):
        self.component.enabled_in_hangar = lambda: True
        self.config().setSpaceIdOverride(False, EVENT_PATH)
        self.hangar = Hangar(EVENT_PATH)

        notice = self.component.ui_action('choose', 'h16_mt_museum')

        assert self.config()._spaceIdOverride[False] == EVENT_PATH
        assert notice['text'] == 'hangar_space_held'

    def test_choosing_a_space_in_the_window_reloads_into_it(self):
        self.component.enabled_in_hangar = lambda: True

        notice = self.component.ui_action('choose', 'h16_mt_museum')

        assert self.switcher.reloads == 1
        assert notice['text'] == 'hangar_space_applied'

    def test_choosing_a_look_in_the_window_switches_it(self):
        self.component.enabled_in_hangar = lambda: True

        self.component.ui_action('look', 'look:autumn_rain')

        assert self.switched == ['h08_mt_hangar_Autumn_TD3']

    def test_the_game_hangar_in_the_window_drops_our_slots(self):
        self.component.enabled_in_hangar = lambda: True
        self.component.ui_action('choose', 'h16_mt_museum')

        self.component.ui_action('native')

        assert self.config()._spaceIdOverride == {True: None, False: None}


def write_bitmap(path):
    width, height = 32, 18
    pixels = bytes(bytearray((64, 128, 192))) * width * height
    header = struct.pack(str('<2sIHHI'), b'BM', 54 + len(pixels), 0, 0, 54)
    info = struct.pack(str('<IiiHHIIiiII'), 40, width, height, 1, 24, 0, len(pixels), 0, 0, 0, 0)
    with io.open(path, 'wb') as stream:
        stream.write(header + info + pixels)


class PreviewTest(ClientCase):

    def setUp(self):
        ClientCase.setUp(self)
        self.now = [0.0]
        self.pending = []
        self.shots = []
        self.notify = [None]
        self.restored = []
        self.clean = [True]
        self.big_world.time = lambda: self.now[0]
        self.big_world.callback = lambda delay, callback: self.pending.append(callback)
        self.big_world.setScreenshotNotifyCallback = lambda callback: self.notify.__setitem__(0, callback)
        self.big_world.screenShot = self.screen_shot
        capture = sys.modules['otmetki.features.hangar_space.client.capture']
        capture.hide_interface = lambda restore: restore.append(lambda: self.restored.append(True))
        self.client.clean_hangar_on_screen = lambda: self.clean[0]
        self.client.current_name = lambda: self.hangar.spacePath.split('/')[1]
        self.component.enabled_in_hangar = lambda: True

    def screen_shot(self, extension, name):
        path = '%s_000.%s' % (name, extension)
        write_bitmap(path)
        self.shots.append(path)
        self.notify[0](path)

    def run_pending(self):
        while self.pending:
            self.pending.pop(0)()

    def settle(self):
        self.component._check_preview()
        self.now[0] += 10.0
        self.component._check_preview()
        self.run_pending()

    def pick_museum(self):
        self.component.ui_action('choose', MUSEUM)
        self.hangar = Hangar(MUSEUM_PATH)
        self.pending = []

    def saved_path(self, key):
        return os.path.join(self.folder, 'hangar_previews', key + '.png')

    def test_a_pick_saves_one_preview_of_the_hangar_it_leads_to(self):
        self.pick_museum()

        self.settle()

        assert os.path.isfile(self.saved_path(MUSEUM))

    def test_the_shot_asks_the_engine_for_a_bitmap_in_the_capture_folder(self):
        self.pick_museum()

        self.settle()

        assert self.shots[0].endswith(os.path.join('hangar_previews', 'capture', 'shot_000.bmp'))

    def test_the_capture_bitmap_is_deleted_after_the_preview_is_saved(self):
        self.pick_museum()

        self.settle()

        assert not os.path.exists(self.shots[0])

    def test_the_interface_comes_back_after_the_shot(self):
        self.pick_museum()

        self.settle()

        assert self.restored == [True]

    def test_a_space_is_shot_once(self):
        self.pick_museum()
        self.settle()

        self.pick_museum()
        self.settle()

        assert len(self.shots) == 1

    def test_no_pick_no_shot(self):
        self.settle()

        assert self.shots == []

    def test_no_shot_while_the_settings_window_covers_the_hangar(self):
        self.clean[0] = False
        self.pick_museum()

        self.settle()

        assert self.shots == []

    def test_the_refresh_button_shoots_a_hangar_that_has_a_preview(self):
        self.pick_museum()
        self.settle()

        self.component.ui_action('refresh_preview')
        self.settle()

        assert len(self.shots) == 2

    def test_a_look_live_in_its_space_is_saved_under_the_look(self):
        self.component.ui_action('look', 'look:autumn_rain')
        self.pending = []

        self.settle()

        assert os.path.isfile(self.saved_path('h08_mt_hangar__autumn_rain'))

    def test_the_gallery_shows_the_saved_preview(self):
        self.pick_museum()
        self.settle()

        rows = {row['id']: row for row in self.component.ui_page()['rows']}

        assert rows[MUSEUM]['image'].startswith('data:image/png;base64,')

    def test_a_tile_without_preview_keeps_the_fallback(self):
        rows = {row['id']: row for row in self.component.ui_page()['rows']}

        assert rows[MUSEUM]['image'] is None

    def test_the_card_thumbnail_is_the_chosen_hangar_preview(self):
        self.pick_museum()
        self.settle()

        assert self.component.ui_thumb().startswith('data:image/png;base64,')


if __name__ == '__main__':
    unittest.main()
