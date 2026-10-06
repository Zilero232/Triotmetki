from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import json
import sys
import unittest

import _support
from test_hud_gameface_window import GAMEFACE_MODULE, STUBBED, Constants, install_stubs

LAMP = 'otmetki.hud.sixth_sense'
LAYOUT_ID = 5


class PageModel(object):

    def __init__(self):
        self.states = []
        self.send = Event()

    def set_state(self, text):
        self.states.append(json.loads(text))


class Event(object):

    def __iadd__(self, handler):
        return self

    def __isub__(self, handler):
        return self


class PageView(object):

    def __init__(self):
        self.viewModel = PageModel()

    def _on_send(self, args=None):
        pass


class Window(object):
    opened = []

    def __init__(self, layout, backend):
        self.uniqueID = len(Window.opened) + 1
        self.windowStatus = Constants.LOADED
        self.destroyed = False
        Window.opened.append(self)

    def load(self):
        pass

    def destroy(self):
        self.destroyed = True


class GamefaceSpaceTest(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = {name: sys.modules.get(name) for name in STUBBED + (GAMEFACE_MODULE,)}
        install_stubs()
        sys.modules.pop(GAMEFACE_MODULE, None)
        self.gameface = importlib.import_module(GAMEFACE_MODULE)
        self.frames = []
        self.gameface._next_frame = self.frames.append
        self.gameface.current_space = lambda: 'battle'
        self.gameface.cursor_visible = lambda: False
        self.gameface.layout_id = lambda: LAYOUT_ID
        self.gameface.HudWindow = Window
        self.gameface.log = lambda line: None
        Window.opened = []
        self.backend = self.gameface.GamefaceBackend()
        self.backend.modifier.install = lambda: None
        self.backend.last_focus.install = lambda: True

    def tearDown(self):
        _support.drop_modules(set(sys.modules) - self.loaded)
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def run_frames(self):
        while self.frames:
            self.frames.pop(0)()

    def page_up(self):
        self.backend.create(LAMP, {'text': '!'})
        view = PageView()
        self.backend.on_loaded(view)
        self.backend.on_message(json.dumps({'type': 'ready'}))
        self.run_frames()
        return view

    def draw(self, *aliases):
        self.backend.on_message(json.dumps({'type': 'drawn', 'ids': list(aliases)}))

    def test_a_blinking_lamp_logs_its_first_drawing_only(self):
        self.page_up()
        lines = []
        self.gameface.log = lines.append

        for _ in range(3):
            self.draw(LAMP)
            self.draw()

        self.assertEqual(len([line for line in lines if 'draws' in line]), 1)

    def test_a_new_window_logs_the_drawing_again(self):
        self.page_up()
        self.draw(LAMP)
        self.backend._on_space_left(1)
        lines = []
        self.gameface.log = lines.append

        self.page_up()
        self.draw(LAMP)

        self.assertEqual(len([line for line in lines if 'draws' in line]), 1)

    def test_the_page_resource_id_is_looked_up_once_it_is_valid(self):
        lookups = []
        self.gameface.layout_id = lambda: lookups.append(1) or LAYOUT_ID

        for _ in range(5):
            self.backend.available()

        self.assertEqual(len(lookups), 1)

    def test_a_missing_page_resource_id_is_looked_up_again(self):
        answers = [None, LAYOUT_ID]
        self.gameface.layout_id = lambda: answers.pop(0)
        self.backend.available()

        self.assertTrue(self.backend.available())

    def test_the_window_stays_open_when_the_last_label_goes(self):
        self.page_up()

        self.backend.delete(LAMP)

        self.assertFalse(Window.opened[0].destroyed)
        self.assertIs(self.backend.window, Window.opened[0])

    def test_the_page_gets_the_state_without_the_label_that_went(self):
        view = self.page_up()

        self.backend.delete(LAMP)
        self.run_frames()

        self.assertEqual(view.viewModel.states[-1]['panels'], [])

    def test_a_label_that_comes_back_reuses_the_window(self):
        self.page_up()
        self.backend.delete(LAMP)

        self.backend.create(LAMP, {'text': '!'})

        self.assertEqual(len(Window.opened), 1)

    def test_leaving_the_space_closes_the_window(self):
        self.page_up()

        self.backend._on_space_left(1)

        self.assertTrue(Window.opened[0].destroyed)

    def test_a_new_window_waits_for_its_page_before_widgets_count(self):
        self.page_up()
        self.backend._on_space_left(1)

        self.backend.create(LAMP, {'text': '!'})

        self.assertFalse(self.backend.renders_widgets())

    def test_the_page_that_answered_draws_widgets(self):
        self.page_up()

        self.assertTrue(self.backend.renders_widgets())

    def test_a_destroyed_page_no_longer_draws_widgets(self):
        view = self.page_up()

        self.backend.on_destroyed(view)

        self.assertFalse(self.backend.renders_widgets())
