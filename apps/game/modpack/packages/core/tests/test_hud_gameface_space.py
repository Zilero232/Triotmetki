from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import json
import sys
import types
import unittest

import _support

STUBBED = ('BigWorld', 'openwg_gameface')
GAMEFACE_MODULE = 'otmetki.core.client.hud.gameface'
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

    def __init__(self):
        self.viewModel = PageModel()


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


def install_stubs():
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    sys.modules['BigWorld'].callback = lambda delay, callback: None


class GamefaceBackendCase(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = {name: sys.modules.get(name) for name in STUBBED + (GAMEFACE_MODULE,)}
        install_stubs()
        sys.modules.pop(GAMEFACE_MODULE, None)
        self.gameface = importlib.import_module(GAMEFACE_MODULE)
        self.frames = []
        self.space = ['battle']
        self.cursor = [False]
        self.lines = []
        self.gameface._next_frame = self.frames.append
        self.gameface.current_space = lambda: self.space[0]
        self.gameface.cursor_visible = lambda: self.cursor[0]
        self.gameface.page_layout = lambda key: LAYOUT_ID
        self.gameface.pages_usable = lambda: True
        self.gameface.InjectPage = FakePage
        self.gameface.log = self.lines.append
        FakePage.made = []
        self.backend = self.gameface.GamefaceBackend()
        self.backend.modifier.install = lambda: None
        self.backend.cursor_poll.start = lambda: None
        self.hangar, self.battle = FakePage.made

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

    def load(self, page):
        page.view = PageView()
        self.backend.on_inject_page(page, page.view)
        self.run_frames()
        return page.view

    def say(self, page, **message):
        self.backend.on_inject_message(page, json.dumps(message))

    def battle_up(self):
        self.backend.create(LAMP, {'text': '!'})
        view = self.load(self.battle)
        self.say(self.battle, type='ready')
        self.run_frames()
        return view


class GamefaceSpaceTest(GamefaceBackendCase):

    def test_the_first_label_starts_both_pages(self):
        self.backend.create(LAMP, {'text': '!'})

        self.assertEqual([page.started for page in FakePage.made], [1, 1])

    def test_a_second_label_starts_no_page_again(self):
        self.backend.create(LAMP, {'text': '!'})

        self.backend.create('otmetki.hud.damage_log', {'text': 'x'})

        self.assertEqual(self.battle.started, 1)

    def test_the_battle_page_gets_the_battle_labels(self):
        view = self.battle_up()

        self.assertEqual([panel['id'] for panel in view.viewModel.states[-1]['panels']], [LAMP])

    def test_the_battle_page_gets_no_hangar_label(self):
        self.space[0] = 'lobby'
        self.backend.create(HANGAR_LABEL, {'text': '12:00'})
        self.space[0] = 'battle'

        view = self.battle_up()

        self.assertNotIn(HANGAR_LABEL, [panel['id'] for panel in view.viewModel.states[-1]['panels']])

    def test_a_label_waits_for_its_page(self):
        self.backend.create(LAMP, {'text': '!'})

        view = self.load(self.battle)

        self.assertEqual([panel['id'] for panel in view.viewModel.states[-1]['panels']], [LAMP])

    def test_a_label_counts_as_created_before_its_page_loaded(self):
        self.assertTrue(self.backend.create(LAMP, {'text': '!'}))

    def test_nothing_is_confirmed_drawn_before_the_page_loaded(self):
        self.backend.create(LAMP, {'text': '!'})

        self.assertIsNone(self.backend.drawn_aliases())

    def test_the_battle_page_confirms_what_it_draws(self):
        self.battle_up()

        self.say(self.battle, type='drawn', ids=[LAMP])

        self.assertEqual(self.backend.drawn_aliases(), frozenset([LAMP]))

    def test_the_page_of_another_space_is_not_heard(self):
        self.battle_up()
        self.load(self.hangar)

        self.say(self.hangar, type='drawn', ids=[HANGAR_LABEL])

        self.assertIsNone(self.backend.drawn)

    def test_a_battle_page_that_went_confirms_nothing(self):
        self.battle_up()
        self.say(self.battle, type='drawn', ids=[LAMP])
        self.battle.view = None

        self.backend.on_inject_gone(self.battle)

        self.assertIsNone(self.backend.drawn_aliases())

    def test_a_new_battle_page_confirms_nothing_until_it_reports(self):
        self.battle_up()
        self.say(self.battle, type='drawn', ids=[LAMP])

        self.load(self.battle)

        self.assertIsNone(self.backend.drawn_aliases())

    def test_a_blinking_lamp_logs_its_first_drawing_only(self):
        self.battle_up()

        for _ in range(3):
            self.say(self.battle, type='drawn', ids=[LAMP])
            self.say(self.battle, type='drawn', ids=[])

        self.assertEqual(len([line for line in self.lines if 'draws' in line]), 1)

    def test_a_new_page_logs_the_drawing_again(self):
        self.battle_up()
        self.say(self.battle, type='drawn', ids=[LAMP])

        self.load(self.battle)
        self.say(self.battle, type='drawn', ids=[LAMP])

        self.assertEqual(len([line for line in self.lines if 'draws' in line]), 2)

    def test_the_page_gets_the_state_without_the_label_that_went(self):
        view = self.battle_up()

        self.backend.delete(LAMP)
        self.run_frames()

        self.assertEqual(view.viewModel.states[-1]['panels'], [])

    def test_a_panel_moved_on_the_page_reaches_the_listeners(self):
        moves = []
        self.backend.listen(lambda alias, props: moves.append((alias, props)))
        self.battle_up()

        self.say(self.battle, type='moved', id=LAMP, x=40, y=50, align_x='left', align_y='top')

        self.assertEqual(moves, [(LAMP, {'x': 40, 'y': 50, 'alignX': 'left', 'alignY': 'top'})])

    def test_the_ready_page_is_logged_with_its_place(self):
        prefix = 'HUD: Gameface page ready in the battle page (1 labels'

        self.battle_up()

        self.assertEqual(len([line for line in self.lines if line.startswith(prefix)]), 1)

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


class GamefaceWithoutInjectTest(unittest.TestCase):

    def setUp(self):
        self.loaded = set(sys.modules)
        self.saved = {name: sys.modules.get(name) for name in STUBBED + (GAMEFACE_MODULE,)}
        install_stubs()
        sys.modules.pop(GAMEFACE_MODULE, None)
        self.gameface = importlib.import_module(GAMEFACE_MODULE)

    def tearDown(self):
        _support.drop_modules(set(sys.modules) - self.loaded)
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_a_client_without_the_inject_classes_has_no_gameface_backend(self):
        self.assertFalse(self.gameface.GamefaceBackend.usable())

    def test_the_missing_inject_classes_are_named(self):
        self.assertIn('no inject adaptor', self.gameface.GamefaceBackend.missing_reason())


if __name__ == '__main__':
    unittest.main()
