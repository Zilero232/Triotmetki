# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.free_camera.i18n import STRINGS
from otmetki.features.free_camera.model import PLACE_HANGAR, PLACE_REPLAY, START, STOP, Flight, flight_place
from otmetki.features.free_camera.model.constants import HOTKEY_CHOICES, HOTKEYS
from otmetki.features.free_camera.settings import SCHEMA, SETTINGS

VIDEO = 'video'
ARCADE = 'arcade'
KEYS = {
    'KEY_F': 33, 'KEY_LCONTROL': 29, 'KEY_LSHIFT': 42, 'KEY_ESCAPE': 1, 'KEY_W': 17, 'KEY_F3': 61, 'KEY_F7': 65,
    'KEY_F8': 66,
}
STUBBED = (
    'BigWorld', 'Keys', 'BattleReplay', 'ResMgr', 'game', 'gui', 'gui.InputHandler', 'gui.battle_control',
    'gui.battle_control.event_dispatcher', 'AvatarInputHandler', 'AvatarInputHandler.VideoCamera', 'aih_constants',
    'frameworks', 'frameworks.wulf', 'skeletons', 'skeletons.gui', 'skeletons.gui.app_loader', 'helpers',
)
DROPPED_PREFIXES = ('otmetki.core.client', 'otmetki.features.free_camera.client')


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


def module(name, **attrs):
    stub = types.ModuleType(str(name))
    for key, value in attrs.items():
        setattr(stub, key, value)
    return stub


class KeyEvent(object):

    def __init__(self, key, is_down=True):
        self.key = key
        self.is_down = is_down

    def isKeyDown(self):
        return self.is_down

    def isRepeatedEvent(self):
        return False


class MouseEvent(object):

    def __init__(self, dx, dy, dz):
        self.dx = dx
        self.dy = dy
        self.dz = dz


class Camera(object):

    def __init__(self, name):
        self.name = name
        self.matrix = 'matrix of %s' % name


class VideoCamera(object):

    made = []

    def __init__(self, section):
        self.section = section
        self.keys = []
        self.mouse = []
        self.enabled = False
        self.destroyed = False
        VideoCamera.made.append(self)

    def create(self):
        pass

    def enable(self, **args):
        self.enabled = True
        self.args = args

    def disable(self):
        self.enabled = False

    def destroy(self):
        self.destroyed = True

    def handleKeyEvent(self, key, is_down):
        self.keys.append((key, is_down))
        return True

    def handleMouseEvent(self, dx, dy, dz):
        self.mouse.append((dx, dy, dz))


class InputHandler(object):

    def __init__(self):
        self.ctrlModeName = ARCADE
        self.ctrl = None
        self.changes = []

    def isControlModeChangeAllowed(self):
        return True

    def onControlModeChanged(self, mode, **args):
        self.changes.append((mode, args))
        if mode == VIDEO:
            self.ctrl = types.ModuleType(str('ctrl'))
            setattr(self.ctrl, '_VideoCameraControlMode__prevModeName', args.get('prevModeName'))
            setattr(self.ctrl, '_VideoCameraControlMode__previousArgs', dict(args))
        self.ctrlModeName = mode


class Layer(object):

    def __init__(self):
        self.muted = False

    def set_muted(self, muted):
        self.muted = muted


class Ui(object):

    def __init__(self):
        self.muted = False
        self.notices = []

    def set_muted(self, muted):
        self.muted = muted

    def notify(self, text):
        self.notices.append(text)


class Config(object):

    def __init__(self):
        self.enabled = True

    def is_enabled(self, switch):
        return self.enabled


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator({'ru': {}, 'en': {}})
        self.config = Config()
        self.ui = Ui()
        self.in_battle = False


class ModelTest(unittest.TestCase):

    def test_the_switch_and_the_defaults(self):
        assert SETTINGS == ('free_camera',)
        assert SCHEMA.defaults['hotkey'] in HOTKEY_CHOICES

    def test_every_hotkey_choice_has_keys_and_a_label(self):
        assert set(HOTKEY_CHOICES) == set(HOTKEYS)
        for choice in HOTKEY_CHOICES:
            assert 'free_camera_hotkey_%s' % choice in STRINGS['en']

    def test_a_live_battle_is_never_a_place_to_fly(self):
        assert flight_place(in_battle=True, is_replay=False) is None

    def test_the_hangar_and_a_replay_are(self):
        assert flight_place(in_battle=False, is_replay=False) == PLACE_HANGAR
        assert flight_place(in_battle=True, is_replay=True) == PLACE_REPLAY

    def test_the_key_starts_where_it_is_allowed_and_stops_anywhere(self):
        flight = Flight()

        assert flight.press(None, SCHEMA.defaults) is None
        assert flight.press(PLACE_HANGAR, dict(SCHEMA.defaults, in_hangar=False)) is None
        assert flight.press(PLACE_REPLAY, SCHEMA.defaults) == START
        flight.started(PLACE_REPLAY, True)
        assert flight.press(None, SCHEMA.defaults) == STOP
        assert flight.stopped() == (PLACE_REPLAY, True)
        assert not flight.active

    def test_ru_and_en_strings_match(self):
        assert set(STRINGS['ru']) == set(STRINGS['en'])


class FreeCameraClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        self.hangar_camera = Camera('hangar')
        self.cameras = [self.hangar_camera]
        self.replay = False
        self.input_handler = InputHandler()
        self.gui_toggles = []
        self.lobby_layers = []
        self.game_keys = []
        self.game_mouse = []
        self.key_down = Event()
        VideoCamera.made = []
        self._install_stubs()
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state['config'] = ComponentConfig(MemoryFile())
        self.layer = Layer()
        hud._state['layer'] = self.layer
        self.client = importlib.import_module('otmetki.features.free_camera.client')
        self.app = App()
        self.feature = self.client.FreeCamera(self.app)

    def tearDown(self):
        hud = sys.modules.get('otmetki.core.client.hud')
        if hud is not None:
            hud._state['layer'] = None
        for name, value in self.saved.items():
            if value is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = value
        _support.forget_modules(DROPPED_PREFIXES)

    def _camera(self, camera=None):
        if camera is not None:
            self.cameras.append(camera)
        return self.cameras[-1]

    def _install_stubs(self):
        test = self
        held = set()
        sys.modules['BigWorld'] = module(
            'BigWorld',
            camera=self._camera,
            isKeyDown=lambda key: key in held,
            player=lambda: module('player', inputHandler=test.input_handler),
        )
        self.held = held
        sys.modules['Keys'] = module('Keys', **KEYS)
        sys.modules['BattleReplay'] = module('BattleReplay', isPlaying=lambda: test.replay)
        sys.modules['ResMgr'] = module(
            'ResMgr', openSection=lambda path: None, DataSection=lambda name: 'section %s' % name,
        )
        sys.modules['game'] = module(
            'game',
            handleKeyEvent=lambda event: test.game_keys.append(event.key) or test._dispatch(event),
            handleMouseEvent=lambda event: test.game_mouse.append(event.dx) or False,
        )
        sys.modules['gui'] = module('gui')
        handler = module('handler', onKeyDown=self.key_down)
        sys.modules['gui.InputHandler'] = module('gui.InputHandler', g_instance=handler)
        sys.modules['gui'].InputHandler = sys.modules['gui.InputHandler']
        sys.modules['gui.battle_control'] = module('gui.battle_control')
        toggle = lambda: test.gui_toggles.append(True)  # noqa: E731
        dispatcher = module('gui.battle_control.event_dispatcher', toggleGUIVisibility=toggle)
        sys.modules['gui.battle_control.event_dispatcher'] = dispatcher
        sys.modules['gui.battle_control'].event_dispatcher = dispatcher
        sys.modules['AvatarInputHandler'] = module('AvatarInputHandler')
        video = module('AvatarInputHandler.VideoCamera', VideoCamera=VideoCamera)
        sys.modules['AvatarInputHandler.VideoCamera'] = video
        modes = module('modes', VIDEO=VIDEO, ARCADE=ARCADE)
        sys.modules['aih_constants'] = module('aih_constants', CTRL_MODE_NAME=modes)
        sys.modules['frameworks'] = module('frameworks')
        sys.modules['frameworks.wulf'] = module('frameworks.wulf', WindowLayer=module('layers', VIEW=1, WINDOW=2))
        sys.modules['skeletons'] = module('skeletons')
        sys.modules['skeletons.gui'] = module('skeletons.gui')
        sys.modules['skeletons.gui.app_loader'] = module('skeletons.gui.app_loader', IAppLoader='IAppLoader')
        self._install_lobby()

    def _install_lobby(self):
        test = self
        containers = module(
            'containers',
            hideContainers=lambda layers, time: test.lobby_layers.append(('hide', layers)),
            showContainers=lambda layers, time: test.lobby_layers.append(('show', layers)),
        )
        lobby = module('lobby', containerManager=containers)
        loader = module('loader', getDefLobbyApp=lambda: lobby)
        sys.modules['helpers'] = module('helpers', dependency=module('dependency', instance=lambda skeleton: loader))

    def _dispatch(self, event):
        if event.isKeyDown():
            self.key_down(event)
        return False

    def press(self, *names):
        self.held.clear()
        self.held.update(KEYS[name] for name in names)
        game = sys.modules['game']
        return game.handleKeyEvent(KeyEvent(KEYS[names[-1]]))

    def test_the_hotkey_flies_the_video_camera_over_the_hangar_and_back(self):
        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        camera = VideoCamera.made[0]
        assert self.feature.flight.place == PLACE_HANGAR
        assert camera.enabled
        assert camera.args == {'camMatrix': 'matrix of hangar'}
        assert self.layer.muted
        assert self.lobby_layers == [('hide', (1, 2))]

        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        assert not self.feature.flight.active
        assert camera.destroyed
        assert self.cameras[-1] is self.hangar_camera
        assert not self.layer.muted
        assert self.lobby_layers[-1] == ('show', (1, 2))

    def test_while_flying_the_hangar_keys_and_mouse_go_to_the_camera(self):
        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')
        self.game_keys[:] = []

        handled = self.press('KEY_W')
        sys.modules['game'].handleMouseEvent(MouseEvent(5, -2, 0))

        assert handled is True
        assert self.game_keys == []
        assert self.game_mouse == []
        assert VideoCamera.made[0].keys == [(KEYS['KEY_W'], True)]
        assert VideoCamera.made[0].mouse == [(5, -2, 0)]

    def test_escape_lands_the_camera(self):
        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        self.press('KEY_ESCAPE')

        assert not self.feature.flight.active
        assert VideoCamera.made[0].destroyed

    def test_a_live_battle_never_gets_the_camera(self):
        self.app.in_battle = True

        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        assert not self.feature.flight.active
        assert self.input_handler.changes == []
        assert VideoCamera.made == []

    def test_a_replay_switches_to_the_video_mode_and_back_to_where_it_was(self):
        self.app.in_battle = True
        self.replay = True

        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        assert self.input_handler.changes[0] == (VIDEO, {'prevModeName': ARCADE, 'camMatrix': 'matrix of hangar'})
        assert self.gui_toggles == [True]

        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        assert self.input_handler.changes[-1][0] == ARCADE
        assert self.gui_toggles == [True, True]
        assert not self.layer.muted

    def test_entering_a_battle_lands_the_hangar_camera(self):
        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        self.app.bus.emit('battle_enter')

        assert not self.feature.flight.active
        assert VideoCamera.made[0].destroyed

    def test_a_battle_entered_mid_flight_keeps_its_own_camera(self):
        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')
        camera = VideoCamera.made[0]
        battle_camera = self._camera(Camera('battle'))
        self.lobby_layers[:] = []

        self.app.bus.emit('battle_enter')

        assert self.cameras[-1] is battle_camera
        assert camera.enabled
        assert camera.destroyed
        assert self.lobby_layers == []
        assert not self.layer.muted

    def test_the_client_key_handler_stays_its_own_outside_a_flight(self):
        original = sys.modules['game'].handleKeyEvent

        self.feature.settings_changed(['hotkey'])

        assert sys.modules['game'].handleKeyEvent is original

    def test_landing_gives_the_client_its_key_handler_back(self):
        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        self.press('KEY_ESCAPE')

        assert not self.feature.input_hooked

    def test_a_handler_another_mod_wrapped_mid_flight_stays_wrapped(self):
        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')
        game = sys.modules['game']
        ours = game.handleKeyEvent
        game.handleKeyEvent = lambda event: ours(event)

        self.press('KEY_ESCAPE')

        assert self.feature.input_hooked

    def test_switched_off_the_key_does_nothing(self):
        self.app.config.enabled = False
        self.feature.settings_changed(['hotkey'])

        self.press('KEY_LCONTROL', 'KEY_LSHIFT', 'KEY_F')

        assert not self.feature.flight.active


if __name__ == '__main__':
    unittest.main()
