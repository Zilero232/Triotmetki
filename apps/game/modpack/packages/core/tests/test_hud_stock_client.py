# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer, alias_of, panel_schema
from otmetki.core.storage import MemoryFile

STUBBED = (
    'BigWorld',
    'gui',
    'gui.Scaleform',
    'gui.Scaleform.daapi',
    'gui.Scaleform.daapi.view',
    'gui.Scaleform.daapi.view.battle',
    'gui.Scaleform.daapi.view.battle.shared',
    'gui.Scaleform.daapi.view.battle.shared.page',
    'gui.Scaleform.daapi.view.battle.classic',
    'gui.Scaleform.daapi.view.battle.classic.page',
)
HOOKED = ('_populate', '_dispose', '_setComponentsVisibility', '_onRegisterFlashComponent')


class SharedPage(object):

    def __init__(self):
        self.applied = []
        self._fsToggling = set()

    def _populate(self):
        return 'populated'

    def _dispose(self):
        return 'disposed'

    def _setComponentsVisibility(self, visible=None, hidden=None):
        self.applied.append((set(visible or ()), set(hidden or ())))

    def as_setComponentsVisibilityS(self, visible, hidden):
        self.applied.append((set(visible), set(hidden)))

    def _onRegisterFlashComponent(self, view, alias):
        self.components[alias] = view


class ClassicPage(SharedPage):
    pass


class EpicPage(SharedPage):
    pass


class Event(object):

    def __init__(self, ctx):
        self.ctx = ctx


class Everything(object):

    def __contains__(self, alias):
        return True


class Backend(HudBackend):

    def __init__(self):
        self.drawn = Everything()
        self.drawn_listeners = []

    def available(self):
        return True

    def drawn_aliases(self):
        return self.drawn

    def listen_drawn(self, on_drawn):
        self.drawn_listeners.append(on_drawn)

    def page_drew(self, *panel_ids):
        self.drawn = None if panel_ids == (None,) else frozenset(alias_of(panel_id) for panel_id in panel_ids)
        for listener in list(self.drawn_listeners):
            listener()

    def create(self, alias, props):
        return True

    def delete(self, alias):
        return True


def install_stubs():
    saved = dict((name, sys.modules.get(name)) for name in STUBBED)
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    sys.modules['BigWorld'].player = lambda: None
    sys.modules['gui.Scaleform.daapi.view.battle.shared.page'].SharedPage = SharedPage
    sys.modules['gui.Scaleform.daapi.view.battle.classic.page'].ClassicPage = ClassicPage
    return saved


def restore_stubs(saved):
    for name, module in saved.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module
    _support.forget_modules('otmetki.core.client.hud')


class StockControlTest(unittest.TestCase):

    def setUp(self):
        self.saved = install_stubs()
        self.originals = dict((name, SharedPage.__dict__[name]) for name in HOOKED)
        from otmetki.core.client.hud.stock import StockControl
        self.backend = Backend()
        self.layer = HudLayer(self.backend, ComponentConfig(MemoryFile()))
        self.layer.register('panel', panel_schema({}))
        self.bus = EventBus()
        self.control = StockControl(self.layer, self.bus)
        assert self.control.install()

    def tearDown(self):
        for name, value in self.originals.items():
            setattr(SharedPage, name, value)
        restore_stubs(self.saved)

    def populated_page(self, page_class=ClassicPage):
        page = page_class()
        page._populate()
        return page

    def test_populate_keeps_the_stock_result(self):
        page = ClassicPage()

        result = page._populate()

        assert result == 'populated'

    def test_populate_hides_a_suppressed_alias(self):
        page = ClassicPage()
        self.control.want('team_hp', ('fragCorrelationBar',))

        page._populate()

        assert page.applied[-1] == (set(), {'fragCorrelationBar'})

    def test_suppressed_alias_stays_hidden_on_the_classic_page(self):
        page = ClassicPage()
        self.control.want('team_hp', ('fragCorrelationBar',))
        page._populate()

        page._setComponentsVisibility(visible={'fragCorrelationBar', 'damagePanel'})

        assert page.applied[-1] == ({'damagePanel'}, {'fragCorrelationBar'})

    def test_releasing_the_alias_shows_it_again(self):
        page = ClassicPage()
        self.control.want('team_hp', ('fragCorrelationBar',))
        page._populate()

        self.control.want('team_hp', ())

        assert page._fsToggling == set()
        assert page.applied[-1] == ({'fragCorrelationBar'}, set())

    def test_a_released_alias_follows_the_stock_visibility(self):
        page = ClassicPage()
        self.control.want('team_hp', ('fragCorrelationBar',))
        page._populate()
        self.control.want('team_hp', ())

        page._setComponentsVisibility(visible={'fragCorrelationBar'})

        assert page.applied[-1] == ({'fragCorrelationBar'}, set())

    def test_every_battle_page_with_the_element_hides_it(self):
        page = EpicPage()
        self.control.want('team_hp', ('fragCorrelationBar',))
        page._populate()

        page._setComponentsVisibility(visible={'fragCorrelationBar'})

        assert page.applied[-1] == (set(), {'fragCorrelationBar'})

    def test_restore_while_full_stats_is_open_waits_for_the_page(self):
        page = self.populated_page()
        self.control.want('sixth_sense', ('sixthSense',))
        page._fsToggling.add('damagePanel')

        self.control.want('sixth_sense', ())

        assert 'sixthSense' in page._fsToggling

    def test_every_battle_type_hides_the_stock_element_the_page_has(self):
        page = self.populated_page()
        page.components = {'battleDamageLogPanel': object()}

        for mode in ('random', 'comp7', 'frontline', 'event', 'battle_royale', None):
            self.layer.enter_mode(mode)
            self.control.want('damage_log', ('battleDamageLogPanel',))

            assert self.control.hidden == frozenset(('battleDamageLogPanel',))

    def test_a_stock_element_registered_after_the_page_is_hidden_then(self):
        page = ClassicPage()
        page.components = {'damagePanel': object()}
        page._populate()
        self.control.want('damage_log', ('battleDamageLogPanel',))

        page._onRegisterFlashComponent(object(), 'battleDamageLogPanel')

        assert page.applied[-1] == (set(), {'battleDamageLogPanel'})

    def test_an_alias_the_page_turned_out_not_to_have_is_not_shown_back(self):
        page = self.populated_page()
        self.control.want('damage_log', ('battleDamageLogPanel',))
        page.components = {'damagePanel': object()}

        self.control.sync()

        assert page.applied == [(set(), {'battleDamageLogPanel'})]
        assert self.control.hidden == frozenset()

    def test_the_summary_names_the_page_and_the_aliases_found_and_hidden(self):
        page = ClassicPage()
        page.alias = 'classicBattlePage'
        page.components = {'battleDamageLogPanel': object(), 'sixthSense': object()}
        page._populate()
        self.control.want('damage_log', ('battleDamageLogPanel',))

        summary = self.control.summary()

        assert summary == {
            'page': 'classicBattlePage',
            'found': ['battleDamageLogPanel', 'sixthSense'],
            'hidden': ['battleDamageLogPanel'],
        }

    def test_no_summary_off_the_battle_page(self):
        assert self.control.summary() is None

    def test_an_alias_the_page_does_not_have_is_left_alone(self):
        page = ClassicPage()
        page.components = {'damagePanel': object()}
        page._populate()

        self.control.want('team_hp', ('fragCorrelationBar',))

        assert page.applied == []
        assert self.control.hidden == frozenset()

    def test_an_alias_the_page_gains_later_is_hidden_on_sync(self):
        page = ClassicPage()
        page.components = {'damagePanel': object()}
        page._populate()
        self.control.want('team_hp', ('fragCorrelationBar',))
        page.components['fragCorrelationBar'] = object()

        self.control.sync()

        assert page.applied[-1] == (set(), {'fragCorrelationBar'})

    def test_a_muted_panel_gives_its_stock_element_back(self):
        page = self.populated_page()
        self.control.want('panel', ('fragCorrelationBar',))

        self.layer.set_muted(True)

        assert page.applied[-1] == ({'fragCorrelationBar'}, set())

    def test_the_stock_element_is_hidden_again_when_the_panel_is_back(self):
        page = self.populated_page()
        self.control.want('panel', ('fragCorrelationBar',))
        self.layer.set_muted(True)

        self.layer.set_muted(False)

        assert page.applied[-1] == (set(), {'fragCorrelationBar'})

    def test_a_panel_muted_before_it_asks_hides_nothing(self):
        page = self.populated_page()
        self.layer.set_muted(True)

        self.control.want('panel', ('fragCorrelationBar',))

        assert page.applied == []

    def test_the_killer_camera_gives_the_stock_element_back(self):
        page = self.populated_page()
        self.control.want('panel', ('fragCorrelationBar',))

        self.layer.set_cover('killcam', True)

        assert page.applied[-1] == ({'fragCorrelationBar'}, set())

    def test_tab_keeps_the_stock_element_hidden(self):
        self.populated_page()
        self.control.want('panel', ('fragCorrelationBar',))

        self.layer.set_cover('full_stats', True)

        assert self.control.hidden == frozenset(('fragCorrelationBar',))

    def test_the_stock_element_stays_until_the_page_draws_the_panel(self):
        page = self.populated_page()
        self.backend.page_drew(None)

        self.control.want('panel', ('fragCorrelationBar',))

        assert page.applied == []

    def test_the_stock_element_goes_once_the_page_draws_the_panel(self):
        page = self.populated_page()
        self.backend.page_drew(None)
        self.control.want('panel', ('fragCorrelationBar',))

        self.backend.page_drew('panel')

        assert page.applied[-1] == (set(), {'fragCorrelationBar'})

    def test_the_stock_element_comes_back_when_the_page_stops_drawing_the_panel(self):
        page = self.populated_page()
        self.control.want('panel', ('fragCorrelationBar',))

        self.backend.page_drew('other')

        assert page.applied[-1] == ({'fragCorrelationBar'}, set())

    def test_the_stock_element_comes_back_when_the_page_is_gone(self):
        page = self.populated_page()
        self.control.want('panel', ('fragCorrelationBar',))

        self.backend.page_drew(None)

        assert page.applied[-1] == ({'fragCorrelationBar'}, set())

    def test_a_lamp_hides_its_stock_lamp_while_the_page_draws_whatever_it_shows(self):
        page = self.populated_page()
        self.backend.page_drew('other')

        self.control.want('panel', ('sixthSense',), while_hidden=True)

        assert page.applied[-1] == (set(), {'sixthSense'})

    def test_a_lamp_gives_its_stock_lamp_back_when_the_page_is_gone(self):
        page = self.populated_page()
        self.control.want('panel', ('sixthSense',), while_hidden=True)

        self.backend.page_drew(None)

        assert page.applied[-1] == ({'sixthSense'}, set())

    def test_a_reticle_part_stays_until_the_page_draws_the_panel(self):
        self.populated_page()
        self.backend.page_drew(None)

        self.control.want('panel', ('reloaderTimerAlphaValue',))

        assert self.control.reticle.hidden == frozenset()

    def test_a_reticle_part_goes_once_the_page_draws_the_panel(self):
        self.populated_page()
        self.backend.page_drew(None)
        self.control.want('panel', ('reloaderTimerAlphaValue',))

        self.backend.page_drew('panel')

        assert self.control.reticle.hidden == frozenset(['reloaderTimerAlphaValue'])

    def test_alt_down_goes_out_on_the_bus_once(self):
        held = []
        self.bus.on('battle_extended_info', held.append)
        ClassicPage()._populate()

        self.control._on_extended_info(Event({'isDown': True}))
        self.control._on_extended_info(Event({'isDown': True}))

        assert held == [True]

    def test_alt_ends_with_the_battle_page(self):
        held = []
        self.bus.on('battle_extended_info', held.append)
        page = self.populated_page()
        self.control._on_extended_info(Event({'isDown': True}))

        page._dispose()

        assert held == [True, False]


class CrosshairPanelContainer(object):

    def __init__(self):
        self.pushed = []

    def setSettings(self, vo):
        self.pushed.append(vo)

    def as_setSettingsS(self, vo):
        self.pushed.append(vo)

    def _dispose(self):
        return 'disposed'


RETICLE_MODULES = (
    'gui.Scaleform.daapi.view.battle.shared.crosshair',
    'gui.Scaleform.daapi.view.battle.shared.crosshair.container',
)
RETICLE_HOOKED = ('setSettings', '_dispose')


class StockControlFirstBattleTest(unittest.TestCase):

    def setUp(self):
        self.saved = install_stubs()
        self.saved.update((name, sys.modules.get(name)) for name in RETICLE_MODULES)
        for name in RETICLE_MODULES:
            sys.modules[name] = types.ModuleType(str(name))
        sys.modules[RETICLE_MODULES[1]].CrosshairPanelContainer = CrosshairPanelContainer
        self.originals = dict((name, SharedPage.__dict__[name]) for name in HOOKED)
        self.reticle_originals = dict((name, CrosshairPanelContainer.__dict__[name]) for name in RETICLE_HOOKED)
        from otmetki.core.client.hud.stock import StockControl
        self.backend = Backend()
        self.layer = HudLayer(self.backend, ComponentConfig(MemoryFile()))
        self.layer.register('panel', panel_schema({}))
        self.control = StockControl(self.layer, EventBus())

    def tearDown(self):
        for name, value in self.originals.items():
            setattr(SharedPage, name, value)
        for name, value in self.reticle_originals.items():
            setattr(CrosshairPanelContainer, name, value)
        restore_stubs(self.saved)

    def test_a_page_populated_before_any_panel_asks_is_followed(self):
        page = ClassicPage()
        page._populate()

        self.control.want('team_hp', ('fragCorrelationBar',))

        assert page.applied[-1] == (set(), {'fragCorrelationBar'})

    def test_reticle_settings_given_before_any_panel_asks_are_hidden_later(self):
        panel = CrosshairPanelContainer()
        panel.setSettings({1: {'reloaderTimerAlphaValue': 1.0}})
        ClassicPage()._populate()

        self.control.want('panel', ('reloaderTimerAlphaValue',))

        assert panel.pushed[-1] == {1: {'reloaderTimerAlphaValue': 0}}


if __name__ == '__main__':
    unittest.main()
