from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import json
import sys
import unittest

import _support
from test_hud_gameface_window import GAMEFACE_MODULE, STUBBED, Constants, install_stubs

LAMP = 'otmetki.hud.sixth_sense'
HANGAR_LABEL = 'otmetki.hangar_info'
LAYOUT_ID = 5


class Event(object):

    def __iadd__(self, handler):
        return self

    def __isub__(self, handler):
        return self


class PageModel(object):

    def __init__(self):
        self.states = []
        self.send = Event()

    def set_state(self, text):
        self.states.append(json.loads(text))


class PageView(object):

    def __init__(self, window=None):
        self.viewModel = PageModel()
        self.window = window

    def _on_send(self, args=None):
        pass


class Window(object):
    opened = []

    def __init__(self, layout, backend):
        self.uniqueID = len(Window.opened) + 1
        self.windowStatus = Constants.LOADED
        self.destroyed = False
        self.isFocused = False
        Window.opened.append(self)

    def load(self):
        pass

    def destroy(self):
        self.destroyed = True


class FakePage(object):
    made = []

    def __init__(self, owner, place):
        self.owner = owner
        self.place = place
        self.view = None
        self.mouse = []
        self.started = 0
        FakePage.made.append(self)

    def start(self):
        self.started += 1

    def set_mouse(self, enabled):
        self.mouse.append(enabled)


class GamefaceBackendCase(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = {name: sys.modules.get(name) for name in STUBBED + (GAMEFACE_MODULE,)}
        install_stubs()
        sys.modules.pop(GAMEFACE_MODULE, None)
        self.gameface = importlib.import_module(GAMEFACE_MODULE)
        self.frames = []
        self.space = ['battle']
        self.lines = []
        self.gameface._next_frame = self.frames.append
        self.gameface.current_space = lambda: self.space[0]
        self.gameface.cursor_visible = lambda: False
        self.gameface.page_layout = lambda key: LAYOUT_ID
        self.gameface.pages_usable = lambda: True
        self.gameface.InjectPage = FakePage
        self.gameface.HudWindow = Window
        self.gameface.log = self.lines.append
        FakePage.made = []
        Window.opened = []
        self.backend = self.gameface.GamefaceBackend()
        self.backend.modifier.install = lambda: None
        self.backend.last_focus.install = lambda: True
        self.backend.cursor_poll.start = lambda: None
        self.hangar = self.backend.hangar

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

    def say(self, **message):
        self.backend.on_message(json.dumps(message))

    def battle_up(self):
        self.backend.create(LAMP, {'text': '!'})
        view = PageView(self.backend.window)
        self.backend.on_loaded(view)
        self.say(type='ready')
        self.run_frames()
        return view

    def hangar_up(self):
        self.space[0] = 'lobby'
        self.backend.create(HANGAR_LABEL, {'text': '12:00'})
        self.hangar.view = PageView()
        self.backend.on_inject_page(self.hangar, self.hangar.view)
        self.run_frames()
        return self.hangar.view

    def hangar_says(self, **message):
        self.backend.on_inject_message(self.hangar, json.dumps(message))


class GamefaceBattleWindowTest(GamefaceBackendCase):

    def test_the_first_battle_label_opens_the_hud_window(self):
        self.backend.create(LAMP, {'text': '!'})

        self.assertEqual(len(Window.opened), 1)

    def test_the_battle_page_gets_the_battle_labels(self):
        view = self.battle_up()

        self.assertEqual([panel['id'] for panel in view.viewModel.states[-1]['panels']], [LAMP])

    def test_the_battle_page_gets_no_hangar_label(self):
        self.space[0] = 'lobby'
        self.backend.create(HANGAR_LABEL, {'text': '12:00'})
        self.space[0] = 'battle'

        view = self.battle_up()

        self.assertNotIn(HANGAR_LABEL, [panel['id'] for panel in view.viewModel.states[-1]['panels']])

    def test_a_blinking_lamp_logs_its_first_drawing_only(self):
        self.battle_up()

        for _ in range(3):
            self.say(type='drawn', ids=[LAMP])
            self.say(type='drawn', ids=[])

        self.assertEqual(len([line for line in self.lines if 'draws' in line]), 1)

    def test_a_new_window_logs_the_drawing_again(self):
        self.battle_up()
        self.say(type='drawn', ids=[LAMP])
        self.backend._on_space_left(1)

        self.battle_up()
        self.say(type='drawn', ids=[LAMP])

        self.assertEqual(len([line for line in self.lines if 'draws' in line]), 2)

    def test_the_window_confirms_what_it_draws(self):
        self.battle_up()

        self.say(type='drawn', ids=[LAMP])

        self.assertEqual(self.backend.drawn_aliases(), frozenset([LAMP]))

    def test_nothing_is_confirmed_drawn_before_the_window_page_loaded(self):
        self.backend.create(LAMP, {'text': '!'})

        self.assertIsNone(self.backend.drawn_aliases())

    def test_the_window_stays_open_when_the_last_label_goes(self):
        self.battle_up()

        self.backend.delete(LAMP)

        self.assertFalse(Window.opened[0].destroyed)

    def test_the_page_gets_the_state_without_the_label_that_went(self):
        view = self.battle_up()

        self.backend.delete(LAMP)
        self.run_frames()

        self.assertEqual(view.viewModel.states[-1]['panels'], [])

    def test_a_label_that_comes_back_reuses_the_window(self):
        self.battle_up()
        self.backend.delete(LAMP)

        self.backend.create(LAMP, {'text': '!'})

        self.assertEqual(len(Window.opened), 1)

    def test_leaving_the_battle_closes_the_window(self):
        self.battle_up()

        self.backend._on_space_left(1)

        self.assertTrue(Window.opened[0].destroyed)

    def test_a_destroyed_page_confirms_nothing_drawn(self):
        view = self.battle_up()
        self.say(type='drawn', ids=[LAMP])

        self.backend.on_destroyed(view)

        self.assertIsNone(self.backend.drawn_aliases())

    def test_a_panel_moved_on_the_page_reaches_the_listeners(self):
        moves = []
        self.backend.listen(lambda alias, props: moves.append((alias, props)))
        self.battle_up()

        self.say(type='moved', id=LAMP, x=40, y=50, align_x='left', align_y='top')

        self.assertEqual(moves, [(LAMP, {'x': 40, 'y': 50, 'alignX': 'left', 'alignY': 'top'})])

    def test_the_ready_window_is_logged(self):
        prefix = 'HUD: Gameface page ready in the HUD window (1 labels'

        self.battle_up()

        self.assertEqual(len([line for line in self.lines if line.startswith(prefix)]), 1)

    def test_the_battle_cursor_puts_the_window_page_in_edit_mode(self):
        view = self.battle_up()

        self.backend._set_cursor(True)
        self.run_frames()

        self.assertTrue(view.viewModel.states[-1]['edit'])

    def test_the_first_battle_cursor_is_logged(self):
        self.battle_up()

        self.backend._set_cursor(True)

        self.assertIn('HUD: battle cursor shown, panels can be dragged', self.lines)

    def test_a_window_that_failed_to_open_keeps_the_battle_panels_off(self):
        self.gameface.HudWindow = None

        self.assertFalse(self.backend.create(LAMP, {'text': '!'}))

    def test_the_battle_never_places_a_page(self):
        self.battle_up()

        self.assertEqual(self.hangar.started, 1)
        self.assertEqual(self.hangar.place.space, 'lobby')

    def test_the_page_resource_id_is_looked_up_once_it_is_valid(self):
        lookups = []
        self.gameface.page_layout = lambda key: lookups.append(key) or LAYOUT_ID

        for _ in range(5):
            self.backend.available()

        self.assertEqual(len(lookups), 1)

    def test_a_missing_page_resource_id_is_looked_up_again(self):
        answers = [None, LAYOUT_ID]
        self.gameface.page_layout = lambda key: answers.pop(0)
        self.backend.available()

        self.assertTrue(self.backend.available())


class GamefaceHangarPageTest(GamefaceBackendCase):

    def test_the_first_label_starts_the_hangar_page(self):
        self.space[0] = 'lobby'

        self.backend.create(HANGAR_LABEL, {'text': '12:00'})

        self.assertEqual(self.hangar.started, 1)

    def test_a_second_label_starts_the_hangar_page_once(self):
        self.space[0] = 'lobby'
        self.backend.create(HANGAR_LABEL, {'text': '12:00'})

        self.backend.create('otmetki.session', {'text': 'x'})

        self.assertEqual(self.hangar.started, 1)

    def test_the_lobby_opens_no_window(self):
        self.hangar_up()

        self.assertEqual(Window.opened, [])

    def test_the_hangar_page_gets_the_hangar_labels(self):
        view = self.hangar_up()

        self.assertEqual([panel['id'] for panel in view.viewModel.states[-1]['panels']], [HANGAR_LABEL])

    def test_a_hangar_label_waits_for_its_page(self):
        self.space[0] = 'lobby'

        self.assertTrue(self.backend.create(HANGAR_LABEL, {'text': '12:00'}))

    def test_the_hangar_page_confirms_what_it_draws(self):
        self.hangar_up()

        self.hangar_says(type='drawn', ids=[HANGAR_LABEL])

        self.assertEqual(self.backend.drawn_aliases(), frozenset([HANGAR_LABEL]))

    def test_the_hangar_page_is_not_heard_in_battle(self):
        self.hangar_up()
        self.space[0] = 'battle'

        self.hangar_says(type='drawn', ids=[HANGAR_LABEL])

        self.assertIsNone(self.backend.drawn)

    def test_a_hangar_page_that_went_confirms_nothing(self):
        self.hangar_up()
        self.hangar_says(type='drawn', ids=[HANGAR_LABEL])
        self.hangar.view = None

        self.backend.on_inject_gone(self.hangar)

        self.assertIsNone(self.backend.drawn_aliases())

    def test_the_ready_hangar_page_is_logged(self):
        prefix = 'HUD: Gameface page ready in the hangar view (1 labels'
        self.hangar_up()

        self.hangar_says(type='ready')

        self.assertEqual(len([line for line in self.lines if line.startswith(prefix)]), 1)

    def test_the_hangar_page_takes_no_mouse_without_the_edit_modifier(self):
        self.hangar_up()

        self.assertFalse(self.hangar.mouse[-1])

    def test_the_edit_modifier_gives_the_hangar_page_the_mouse(self):
        self.hangar_up()
        self.backend.modifier.held = True

        self.backend._on_modifier(True)

        self.assertTrue(self.hangar.mouse[-1])

    def test_the_battle_cursor_gives_the_hangar_page_no_mouse(self):
        self.hangar_up()
        self.space[0] = 'battle'

        self.backend._set_cursor(True)

        self.assertFalse(self.hangar.mouse[-1])


class GamefaceWithoutInjectTest(GamefaceBackendCase):

    def setUp(self):
        super(GamefaceWithoutInjectTest, self).setUp()
        self.gameface.pages_usable = lambda: False
        self.backend = self.gameface.GamefaceBackend()
        self.backend.modifier.install = lambda: None
        self.backend.last_focus.install = lambda: True

    def test_a_client_without_the_inject_classes_has_no_hangar_page(self):
        self.assertIsNone(self.backend.hangar)

    def test_the_missing_inject_classes_are_logged(self):
        self.assertIn('no inject adaptor for the hangar page', self.lines[-1])

    def test_the_battle_still_draws_in_the_hud_window(self):
        self.backend.create(LAMP, {'text': '!'})

        self.assertEqual(len(Window.opened), 1)

    def test_the_hangar_labels_stay_off(self):
        self.space[0] = 'lobby'
        self.backend.create(HANGAR_LABEL, {'text': '12:00'})

        self.assertIsNone(self.backend.drawn_aliases())


if __name__ == '__main__':
    unittest.main()
