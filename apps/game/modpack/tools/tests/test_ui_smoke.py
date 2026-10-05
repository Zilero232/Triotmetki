# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import json
import os
import random
import shutil
import sys
import tempfile
import types
import unittest

import _support

ACCOUNT = 12345678
ENTRY_MODULES = (
    'mod_otmetki', 'mod_otmetki_ui', 'mod_otmetki_minimap', 'mod_otmetki_camera', 'mod_otmetki_crosshair',
    'mod_otmetki_hangar_tweaks', 'mod_otmetki_replay_manager', 'mod_otmetki_replay_upload',
)
STUBBED = (
    'gui', 'BigWorld', 'BattleReplay', 'CurrentVehicle', 'PlayerEvents', 'frameworks', 'openwg_gameface', 'Keys',
    'helpers', 'skeletons', 'dossiers2', 'BattleFeedbackCommon', 'account_helpers',
)
KEYS = {'KEY_T': 20, 'KEY_LCONTROL': 29, 'KEY_LSHIFT': 42}
LOAD_ORDER_SEEDS = (0, 1, 2)
PLAYER_EVENTS = (
    'onAccountShowGUI', 'onEnqueued', 'onDequeued', 'onArenaCreated', 'onAvatarReady', 'onAvatarBecomeNonPlayer',
    'onBattleResultsReceived',
)
# RU 1.45 client source (frameworks/wulf): the flag and layer values the window is created with.
WINDOW_FLAGS = {'WINDOW': 1, 'WINDOW_FULLSCREEN': 1024}
WINDOW_LAYERS = {'WINDOW': 7, 'OVERLAY': 11}
WINDOW_STATUSES = {'LOADED': 3, 'DESTROYING': 4, 'DESTROYED': 5}
SETTINGS_CORE_APPLY = ['applySettings', 'applyStorages', 'confirmChanges', 'clearStorages']
SITE_MOD_PAGE = 'https://triotmetki.ru/mod'


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self

    def __call__(self, *args):
        for handler in list(self.handlers):
            handler(*args)


class Namespace(object):

    def __init__(self, **attrs):
        self.__dict__.update(attrs)


class Sink(object):

    def write(self, text):
        pass

    def flush(self):
        pass


class SettingsCore(object):
    # RU 1.45 client source (account_helpers/settings_core/SettingsCore.py): applySettings(diff) returns
    # nothing; applyStorages(restartApproved, force=False) returns (confirmation, revert) pairs that
    # confirmChanges walks; clearStorages() drops the staged values. Only what a storage applied is stored.

    def __init__(self):
        self.values = {
            'minimapAlpha': 0,
            'carouselType': 0,
            'arcade': {'net': 100, 'custom': 3},
            'sniper': {'net': 100},
        }
        self.applied = []
        self.staged = {}
        self.calls = []

    def getSetting(self, name):
        return self.values.get(name)

    def applySettings(self, diff):
        self.calls.append('applySettings')
        self.applied.append(dict(diff))
        self.staged.update(diff)

    def applyStorages(self, restartApproved, force=False):
        self.calls.append('applyStorages')
        return [(None, lambda: None)]

    def confirmChanges(self, confirmators):
        self.calls.append('confirmChanges')
        for confirmation, _ in confirmators:
            if confirmation is not None:
                confirmation()
        self.values.update(self.staged)

    def clearStorages(self):
        self.calls.append('clearStorages')
        self.staged = {}


class AccountSettings(object):
    # RU 1.45 client source (account_helpers/AccountSettings.py): KEY_SETTINGS values by name.
    values = {}

    @classmethod
    def getSettings(cls, name):
        return cls.values.get(name)

    @classmethod
    def setSettings(cls, name, value):
        cls.values[name] = value


def module(name, **attrs):
    stub = types.ModuleType(str(name))
    stub.__dict__.update(attrs)
    sys.modules[name] = stub
    parent, _, child = name.rpartition('.')
    if parent in sys.modules:
        setattr(sys.modules[parent], child, stub)
    return stub


def package(name, path=()):
    stub = module(name)
    stub.__path__ = list(path)
    return stub


def constants(name, values):
    return type(str(name), (object,), values)


class ViewModel(object):

    def __init__(self, properties=0, commands=0):
        self.strings = []
        self.numbers = []
        self._initialize()

    def _initialize(self):
        pass

    def _addStringProperty(self, name, value):
        self.strings.append([name, value])

    def _setString(self, index, value):
        self.strings[index][1] = value

    def _addNumberProperty(self, name, value):
        self.strings.append([name, value])
        self.numbers.append(name)

    def _setNumber(self, index, value):
        self.strings[index][1] = value

    def _addCommand(self, name):
        return Event()


class ViewSettings(object):

    def __init__(self, layout_id, flags=None, model=None):
        self.layout_id = layout_id
        self.model = model


class ViewImpl(object):

    def __init__(self, settings):
        self.settings = settings
        self.children = []

    def getViewModel(self):
        return self.settings.model

    def _onLoading(self, *args, **kwargs):
        pass

    def _finalize(self):
        pass

    def setChildView(self, layout_id, view):
        self.children.append(view)


class HangarCrewWidget(ViewImpl):
    # RU 1.45 client source: gui/impl/lobby/crew/hangar_crew_widget.py, the hangar's Gameface widget.

    def _onLoading(self, *args, **kwargs):
        pass


class StatusEvent(list):

    def __iadd__(self, handler):
        self.append(handler)
        return self


def window_impl_class(test):
    """WindowImpl that records the loaded windows in `test.windows`."""

    class WindowImpl(object):

        def __init__(self, wndFlags=None, content=None, layer=None, parent=None):
            self.content = content
            self.flags = wndFlags
            self.layer = layer
            self.uniqueID = len(test.windows) + 1
            self.windowStatus = 1
            self.onStatusChanged = StatusEvent()
            self.shown = 0

        def load(self):
            test.windows.append(self)
            self.windowStatus = WINDOW_STATUSES['LOADED']
            self.content._onLoading()

        def show(self):
            self.shown += 1

        def destroy(self):
            self.windowStatus = WINDOW_STATUSES['DESTROYED']
            self.content._finalize()
            test.windows.remove(self)

    return WindowImpl


def install_wulf():
    package('frameworks')
    module(
        'frameworks.wulf',
        ViewModel=ViewModel,
        ViewSettings=ViewSettings,
        ViewFlags=constants('ViewFlags', {'VIEW': 1}),
        WindowFlags=constants('WindowFlags', WINDOW_FLAGS),
        WindowLayer=constants('WindowLayer', WINDOW_LAYERS),
        WindowStatus=constants('WindowStatus', WINDOW_STATUSES),
    )


def install_gameface_stubs(test):
    install_wulf()
    package('gui.impl')
    module('gui.impl.pub', ViewImpl=ViewImpl, WindowImpl=window_impl_class(test))
    package('gui.impl.lobby')
    package('gui.impl.lobby.crew')
    module('gui.impl.lobby.crew.hangar_crew_widget', HangarCrewWidget=HangarCrewWidget)

    def inject(model, key, styles=None, modules=None):
        test.injected.append((key, styles, modules))

    module('openwg_gameface', ModDynAccessor=lambda key: (lambda: 'layout:' + key), gf_mod_inject=inject)


def card_of(state, component_id):
    return [item for item in state['components'] if item['id'] == component_id][0]


class UiSmokeTest(unittest.TestCase):

    def setUp(self):
        self.saved_cwd = os.getcwd()
        self.saved_stdout = sys.stdout
        sys.stdout = Sink()
        self.game_dir = tempfile.mkdtemp()
        os.chdir(self.game_dir)
        self.saved_appdata = os.environ.get('APPDATA')
        os.environ['APPDATA'] = os.path.join(self.game_dir, 'AppData')
        self.purge()
        self.windows = []
        self.injected = []
        self.mods_list = []
        self.mods_alerts = []
        self.messages = []
        self.pressed = set()
        self.opened = []
        self.core = SettingsCore()
        self.player = constants('Player', {'databaseID': ACCOUNT, 'arenaUniqueID': None})()
        self.events = constants('PlayerEvents', {})()
        for name in PLAYER_EVENTS:
            setattr(self.events, name, Event())
        self.input = constants('InputHandler', {'onKeyDown': Event()})()
        self.install_stubs()

    def tearDown(self):
        os.chdir(self.saved_cwd)
        os.environ['APPDATA'] = self.saved_appdata
        sys.stdout = self.saved_stdout
        self.purge()
        shutil.rmtree(self.game_dir, ignore_errors=True)

    def purge(self):
        for name in list(sys.modules):
            if name.split('.')[0] in STUBBED:
                del sys.modules[name]

    def install_client_stubs(self):
        test = self
        module(
            'BigWorld',
            callback=lambda delay, fn: None,
            player=lambda: test.player,
            fetchURL=lambda *args, **kwargs: None,
            isKeyDown=lambda key: key in test.pressed,
            openWebBrowser=test.opened.append,
        )
        module('BattleReplay', isPlaying=lambda: False)
        vehicle = constants('CurrentVehicle', {'item': None, 'onChanged': Event()})()
        module('CurrentVehicle', g_currentVehicle=vehicle)
        module('PlayerEvents', g_playerEvents=self.events)
        module('Keys', **KEYS)
        kinds = {'DAMAGE': 1, 'RADIO_ASSIST': 2, 'TRACK_ASSIST': 3, 'STUN_ASSIST': 4, 'KILL': 5}
        module('BattleFeedbackCommon', BATTLE_EVENT_TYPE=constants('BATTLE_EVENT_TYPE', kinds))
        package('dossiers2')
        package('dossiers2.ui')
        module('dossiers2.ui.achievements', ACHIEVEMENT_BLOCK=constants('ACHIEVEMENT_BLOCK', {'TOTAL': 'total'}))

    def install_settings_stubs(self):
        test = self
        module('helpers', dependency=Namespace(instance=lambda interface: test.core))
        package('skeletons')
        package('skeletons.account_helpers')
        module('skeletons.account_helpers.settings_core', ISettingsCore=object)
        AccountSettings.values = {'minimapSize': 1}
        package('account_helpers')
        module('account_helpers.AccountSettings', AccountSettings=AccountSettings, MINIMAP_SIZE='minimapSize')

    def install_gui_stubs(self):
        test = self
        package('gui')
        module(
            'gui.SystemMessages',
            SM_TYPE=constants('SM_TYPE', {'Information': 'info'}),
            pushMessage=lambda text, type=None: test.messages.append(text),
        )
        module('gui.InputHandler', g_instance=self.input)
        mods_list_api = Namespace(
            addModification=lambda **kwargs: test.mods_list.append(kwargs),
            alertModification=lambda id: test.mods_alerts.append((id, True)),
            clearModificationAlert=lambda id: test.mods_alerts.append((id, False)),
        )
        module('gui.modsListApi', g_modsListApi=mods_list_api)
        install_gameface_stubs(self)

    def install_stubs(self):
        self.install_client_stubs()
        self.install_settings_stubs()
        self.install_gui_stubs()
        entry_dirs = [os.path.join(base, 'entry') for base in _support.source_dirs()]
        package('gui.mods', [path for path in entry_dirs if os.path.isdir(path)])
        package('gui.mods.otmetki', [_support.PACKAGES_DIR, _support.MODPACK_DIR])

    def restart(self):
        self.tearDown()
        self.setUp()

    def load(self, entries):
        for name in entries:
            importlib.import_module('gui.mods.' + name)
        return sys.modules['gui.mods.otmetki.companion.app.client'].g_app

    def state(self):
        view = self.windows[-1].content
        return json.loads(view.getViewModel().strings[0][1])

    def send(self, **message):
        self.windows[-1].content.getViewModel().send({'message': json.dumps(message)})

    def open_hangar(self, seed):
        entries = list(ENTRY_MODULES)
        random.Random(seed).shuffle(entries)
        app = self.load(entries)
        self.events.onAccountShowGUI()
        return app

    def open_window(self, seed=0):
        app = self.open_hangar(seed)
        self.mods_list[0]['callback']()
        return app

    def model_value(self, name):
        model = self.windows[-1].content.getViewModel()
        return dict(model.strings)[name]

    def ui_host(self):
        return sys.modules['gui.mods.otmetki.core.registry'].registry().instances['ui']

    def press_hotkey(self):
        self.pressed.update([KEYS['KEY_LCONTROL'], KEYS['KEY_LSHIFT']])
        self.input.onKeyDown(Namespace(key=KEYS['KEY_T']))

    def test_every_load_order_registers_the_ui_with_its_gameface_view_and_one_mods_list_entry(self):
        for seed in LOAD_ORDER_SEEDS:
            self.restart()

            app = self.open_hangar(seed)

            registry = sys.modules['gui.mods.otmetki.core.registry'].registry()
            assert 'ui' in registry.instances
            assert 'minimap' in registry.instances
            assert [view.name for view in app.settings_ui.views] == ['gameface']
            assert len(self.mods_list) == 1
            assert self.mods_list[0]['id'] == 'otmetki'

    def test_the_mods_list_badge_a_package_asks_for_goes_out_when_the_window_opens(self):
        app = self.open_hangar(0)
        app.bus.emit('mods_list_alert', True)

        self.mods_list[0]['callback']()

        assert self.mods_alerts == [('otmetki', True), ('otmetki', False)]

    def test_every_load_order_opens_one_fullscreen_overlay_window_however_often_asked(self):
        for seed in LOAD_ORDER_SEEDS:
            self.restart()
            self.open_hangar(seed)

            self.mods_list[0]['callback']()
            self.mods_list[0]['callback']()

            assert len(self.windows) == 1
            assert self.windows[0].shown == 1
            assert self.windows[0].flags == 1025
            assert self.windows[0].layer == 11

    def test_every_load_order_lists_the_companion_first_and_the_hangar_features(self):
        for seed in LOAD_ORDER_SEEDS:
            self.restart()
            self.open_window(seed)

            ids = [component['id'] for component in self.state()['components']]

            assert ids[0] == 'companion'
            assert 'minimap' in ids
            assert 'replay_manager' in ids

    def test_minimap_transparency_goes_through_the_settings_core_apply_cycle(self):
        for seed in LOAD_ORDER_SEEDS:
            self.restart()
            self.open_window(seed)

            self.send(type='set', component='minimap', key='transparency', value='40')

            assert self.core.applied[-1] == {'minimapAlpha': 40}
            assert self.core.calls[-4:] == SETTINGS_CORE_APPLY
            assert self.core.values['minimapAlpha'] == 40
            assert self.core.staged == {}

    def test_minimap_size_goes_to_account_settings_not_the_settings_core(self):
        for seed in LOAD_ORDER_SEEDS:
            self.restart()
            self.open_window(seed)

            self.send(type='set', component='minimap', key='size', value='3')

            assert AccountSettings.values['minimapSize'] == 3
            assert [diff for diff in self.core.applied if 'minimapSize' in diff] == []

    def test_crosshair_preset_hides_the_net_and_keeps_the_custom_reticle(self):
        for seed in LOAD_ORDER_SEEDS:
            self.restart()
            self.open_window(seed)

            self.send(type='set', component='crosshair', key='preset', value='clean')

            assert self.core.applied[-1]['arcade']['custom'] == 3
            assert self.core.applied[-1]['arcade']['net'] == 0

    def test_a_fresh_install_writes_no_client_setting_on_the_first_hangar(self):
        for seed in LOAD_ORDER_SEEDS:
            self.restart()

            app = self.open_hangar(seed)

            assert self.core.applied == []
            assert 'crosshair' not in app.state.get('native_backup', {})

    def test_a_fresh_install_leaves_the_reticle_to_the_game(self):
        self.open_window(0)

        crosshair = card_of(self.state(), 'crosshair')

        assert [field['value'] for field in crosshair['fields'] if field['key'] == 'preset'] == ['native']

    def test_a_fresh_install_card_offers_the_recommended_reticle(self):
        self.open_window(0)

        actions = card_of(self.state(), 'crosshair')['actions']

        assert [action['id'] for action in actions] == ['native_recommended']

    def test_recommended_writes_the_reticle_and_keeps_the_old_one(self):
        app = self.open_window(0)

        self.send(type='action', component='crosshair', action='native_recommended')

        assert self.core.values['arcade']['net'] == 0
        assert app.state['native_backup']['crosshair']['settings']['arcade'] == {'net': 100, 'custom': 3}

    def test_after_recommended_the_card_offers_the_restore(self):
        self.open_window(0)

        self.send(type='action', component='crosshair', action='native_recommended')

        actions = card_of(self.state(), 'crosshair')['actions']
        assert [action['id'] for action in actions] == ['native_restore']

    def test_the_hangar_again_writes_nothing_more(self):
        self.open_window(0)
        self.send(type='action', component='crosshair', action='native_recommended')
        written = len(self.core.applied)

        self.events.onAccountShowGUI()

        assert len(self.core.applied) == written

    def test_restore_writes_the_old_reticle_back_and_leaves_it_to_the_game(self):
        app = self.open_window(0)
        self.send(type='action', component='crosshair', action='native_recommended')

        self.send(type='action', component='crosshair', action='native_restore')

        crosshair = card_of(self.state(), 'crosshair')
        assert self.core.values['arcade'] == {'net': 100, 'custom': 3}
        assert [field['value'] for field in crosshair['fields'] if field['key'] == 'preset'] == ['native']
        assert 'crosshair' not in app.state['native_backup']

    def test_after_a_restore_the_card_offers_the_recommended_reticle(self):
        self.open_window(0)
        self.send(type='action', component='crosshair', action='native_recommended')

        self.send(type='action', component='crosshair', action='native_restore')

        actions = card_of(self.state(), 'crosshair')['actions']
        assert [action['id'] for action in actions] == ['native_recommended']

    def test_a_pending_preset_of_an_older_build_writes_nothing(self):
        config_dir = os.path.join(self.game_dir, 'mods', 'configs', 'otmetki')
        os.makedirs(config_dir)
        with open(os.path.join(config_dir, 'state.json'), 'w') as handle:
            json.dump({'native_initial_applied': {'crosshair': 0, 'minimap': 0, 'camera': 0}}, handle)

        app = self.open_hangar(0)

        assert self.core.applied == []
        assert 'native_initial_applied' not in app.state

    def test_an_existing_install_writes_no_client_setting(self):
        config_dir = os.path.join(self.game_dir, 'mods', 'configs', 'otmetki')
        os.makedirs(config_dir)
        with open(os.path.join(config_dir, 'config.json'), 'w') as handle:
            json.dump({'enabled': True}, handle)

        self.open_hangar(0)

        assert self.core.applied == []

    def test_a_companion_switch_reaches_the_app_config(self):
        for seed in LOAD_ORDER_SEEDS:
            self.restart()
            app = self.open_window(seed)

            self.send(type='set', component='companion', key='send_shots', value=False)

            assert app.config.get('send_shots') is False

    def test_every_change_bumps_the_state_revision(self):
        self.open_window()

        self.send(type='set', component='minimap', key='transparency', value='40')
        self.send(type='set', component='minimap', key='size', value='3')
        self.send(type='set', component='crosshair', key='preset', value='clean')
        self.send(type='set', component='companion', key='send_shots', value=False)

        assert self.state()['revision'] == 4

    def test_modslist_takes_the_place_of_the_hangar_button(self):
        self.open_hangar(0)

        button = self.ui_host().button

        assert len(self.mods_list) == 1
        assert button.settings is None

    def test_esc_asks_the_page_to_step_back(self):
        self.open_window()

        self.ui_host().window.step_back()

        assert self.model_value('escape') == 1
        assert len(self.windows) == 1

    def test_the_page_answers_esc_and_the_window_stays(self):
        self.open_window()
        window = self.ui_host().window
        window.step_back()

        self.send(type='escape')

        assert not window.watchdog.is_waiting
        assert len(self.windows) == 1

    def test_the_hotkey_opens_the_window(self):
        self.open_hangar(0)

        self.press_hotkey()

        assert len(self.windows) == 1

    def test_the_hotkey_again_closes_the_window(self):
        self.open_hangar(0)
        self.press_hotkey()

        self.press_hotkey()

        assert self.windows == []

    def test_entering_a_battle_closes_the_window(self):
        self.open_hangar(0)
        self.press_hotkey()
        self.press_hotkey()
        self.press_hotkey()

        self.events.onAvatarReady()

        assert self.windows == []

    def test_no_child_view_is_injected_into_the_crew_widget(self):
        self.open_hangar(2)
        widget_class = sys.modules['gui.impl.lobby.crew.hangar_crew_widget'].HangarCrewWidget
        widget = widget_class(None)

        widget._onLoading()

        assert widget.children == []
        assert self.injected == []

    def test_links_open_in_the_game_browser(self):
        self.open_hangar(2)
        browser = sys.modules['gui.mods.otmetki.ui.client.browser']

        is_opened = browser.open_url(SITE_MOD_PAGE)

        assert is_opened
        assert self.opened == [SITE_MOD_PAGE]

    def test_loading_a_saved_profile_restores_its_settings(self):
        app = self.open_window(1)
        self.send(type='profile_save', name='Streamer')
        self.send(type='set', component='companion', key='hud_modifier', value='ctrl')
        profile_id = self.state()['profiles']['active']

        self.send(type='profile_load', id=profile_id)

        assert app.config.get('hud_modifier') == 'alt'
        with open(os.path.join('mods', 'configs', 'otmetki', 'profiles.json')) as handle:
            assert json.load(handle)['profiles'][0]['name'] == 'Streamer'

    def test_the_page_closes_the_window(self):
        self.open_window(1)

        self.send(type='close')

        assert self.windows == []


if __name__ == '__main__':
    unittest.main()
