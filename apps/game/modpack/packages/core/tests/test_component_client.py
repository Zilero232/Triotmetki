# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from otmetki.core.settings import Schema
from otmetki.core.storage import MemoryFile

CLIENT_PREFIX = 'otmetki.core.client'
STRINGS = {
    'ru': {'unbound': u'Не привязан', 'refreshing': u'Обновляю'},
    'en': {'unbound': u'Not bound', 'refreshing': u'Refreshing'},
}
SCHEMA = Schema({'rows': 3})
LAYOUT = {'x': 1, 'y': 2, 'alignX': 'left', 'alignY': 'top'}
REFRESH_EVERY_S = 5.0


def load_component_module():
    """core.client.component on a stubbed BigWorld, its components.json in memory."""
    saved = sys.modules.get('BigWorld')
    sys.modules['BigWorld'] = types.ModuleType(str('BigWorld'))
    try:
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state['config'] = ComponentConfig(MemoryFile())
        return importlib.import_module('otmetki.core.client.component')
    finally:
        if saved is None:
            sys.modules.pop('BigWorld', None)
        else:
            sys.modules['BigWorld'] = saved
        _support.forget_modules(CLIENT_PREFIX)


class Ui(object):

    def __init__(self):
        self.calls = []

    def show(self, alias, text, layout, on_moved=None, widget=None):
        self.calls.append(('show', alias, text, widget))
        return True

    def hide(self, alias):
        self.calls.append(('hide', alias))


class Config(object):

    def __init__(self):
        self.enabled = True

    def is_enabled(self, switch):
        return self.enabled


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator(STRINGS)
        self.config = Config()
        self.ui = Ui()
        self.in_battle = False
        self.bound = True

    def is_bound(self):
        return self.bound


def make_card_class(component):

    class Card(component.PolledHangarCard):

        def __init__(self, app, spec):
            self.reads = 0
            self.card = (u'card', {'kind': 'card'})
            component.PolledHangarCard.__init__(self, app, spec)

        def render_card(self, translate):
            self.reads += 1
            return self.card

    return Card


class RefreshActionTest(unittest.TestCase):

    def setUp(self):
        component = load_component_module()
        self.app = App()
        self.feature = component.FeatureComponent(self.app, 'feature', SCHEMA, 'feature', STRINGS)
        self.refreshed = []

    def refresh_action(self, action):
        return self.feature.refresh_action(action, 'unbound', 'refreshing', lambda: self.refreshed.append(True))

    def test_the_refresh_button_refreshes_and_says_so(self):
        answer = self.refresh_action('refresh')

        assert answer == {'kind': 'info', 'text': u'Обновляю'}
        assert self.refreshed == [True]

    def test_the_refresh_button_without_a_binding_is_an_error(self):
        self.app.bound = False

        answer = self.refresh_action('refresh')

        assert answer == {'kind': 'error', 'text': u'Не привязан'}
        assert self.refreshed == []

    def test_another_action_is_not_answered(self):
        answer = self.refresh_action('site')

        assert answer is None
        assert self.refreshed == []


class PolledHangarCardTest(unittest.TestCase):

    def setUp(self):
        component = load_component_module()
        self.app = App()
        spec = component.CardSpec(
            section='card',
            schema=SCHEMA,
            switch='card',
            strings=STRINGS,
            panel='card_panel',
            layout=LAYOUT,
            refresh_every_s=REFRESH_EVERY_S,
        )
        self.card = make_card_class(component)(self.app, spec)

    def ui_calls(self):
        return self.app.ui.calls

    def test_entering_the_hangar_shows_the_card(self):
        self.app.bus.emit('hangar')

        assert self.ui_calls() == [('show', 'card_panel', u'card', {'kind': 'card'})]

    def test_the_tick_reads_the_card_again_after_the_refresh_period(self):
        self.app.bus.emit('tick', 100.0)
        self.app.bus.emit('tick', 104.0)

        self.app.bus.emit('tick', 105.0)

        assert self.card.reads == 2

    def test_an_unchanged_card_is_not_drawn_again(self):
        self.app.bus.emit('hangar')

        self.app.bus.emit('hangar')

        assert len(self.ui_calls()) == 1

    def test_no_card_takes_the_label_off(self):
        self.app.bus.emit('hangar')
        self.card.card = None

        self.app.bus.emit('hangar')

        assert self.ui_calls()[-1] == ('hide', 'card_panel')

    def test_entering_a_battle_hides_the_card(self):
        self.app.bus.emit('hangar')

        self.app.bus.emit('battle_enter')

        assert self.ui_calls()[-1] == ('hide', 'card_panel')

    def test_a_card_switched_off_is_not_read_and_comes_off(self):
        self.app.bus.emit('hangar')
        self.app.config.enabled = False

        self.card.refresh()

        assert self.card.reads == 1
        assert self.ui_calls()[-1] == ('hide', 'card_panel')

    def test_the_card_is_not_read_in_battle(self):
        self.app.in_battle = True

        self.app.bus.emit('tick', 100.0)

        assert self.card.reads == 0
        assert self.ui_calls() == []

    def test_changed_settings_draw_the_card_again(self):
        self.app.bus.emit('hangar')

        self.card.settings_changed(['rows'])

        assert self.ui_calls()[-2:] == [
            ('hide', 'card_panel'),
            ('show', 'card_panel', u'card', {'kind': 'card'}),
        ]


if __name__ == '__main__':
    unittest.main()
