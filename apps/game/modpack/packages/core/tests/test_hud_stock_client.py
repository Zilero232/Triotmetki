# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import sys
import types
import unittest

import _support  # noqa: F401
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer, panel_schema
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


class View(object):

    def __init__(self, modal):
        self.modal = modal
        self.onDispose = ClientEvent()

    def isViewModal(self):
        return self.modal

    def close(self):
        self.onDispose(self)


class ContainerManager(object):

    def __init__(self):
        self.onViewAddedToContainer = ClientEvent()

    def show(self, view):
        self.onViewAddedToContainer('container', view)


class App(object):

    def __init__(self):
        self.containerManager = ContainerManager()


class ClientEvent(object):

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


class InputHandler(object):

    def __init__(self):
        self.onPostmortemKillerVisionEnter = ClientEvent()
        self.onPostmortemKillerVisionExit = ClientEvent()


class Avatar(object):

    def __init__(self):
        self.inputHandler = InputHandler()


class Backend(HudBackend):

    def available(self):
        return True

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
    for name in [name for name in sys.modules if name.startswith('otmetki.core.client.hud')]:
        del sys.modules[name]


class StockControlTest(unittest.TestCase):

    def setUp(self):
        self.saved = install_stubs()
        self.originals = dict((name, SharedPage.__dict__[name]) for name in HOOKED)
        from otmetki.core.client.hud.stock import StockControl
        self.layer = HudLayer(Backend(), ComponentConfig(MemoryFile()))
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

    def test_panels_hide_with_the_stock_gui(self):
        self.populated_page()
        self.layer.show('panel', 'text')

        self.control._on_gui_visibility(Event({'visible': False}))

        assert self.layer.gui_hidden

    def test_panels_stay_dimmed_while_full_stats_is_open(self):
        self.populated_page()
        self.layer.show('panel', 'text')
        self.control._on_gui_visibility(Event({'visible': False}))
        self.control._on_gui_visibility(Event({'visible': True}))

        self.control._on_full_stats(Event({'isDown': True}))

        assert not self.layer.gui_hidden
        assert self.layer.full_stats

    def test_the_dim_mark_goes_when_full_stats_closes(self):
        self.populated_page()
        self.layer.show('panel', 'text')
        self.control._on_full_stats(Event({'isDown': True}))

        self.control._on_full_stats(Event({'isDown': False}))

        assert not self.layer.full_stats

    def test_the_page_end_shows_the_panels_and_forgets_the_page(self):
        page = self.populated_page()
        self.layer.show('panel', 'text')
        self.control._on_full_stats(Event({'isDown': True}))

        page._dispose()

        assert not self.layer.full_stats
        assert self.control.page is None

    def page_with_app(self):
        page = ClassicPage()
        page.app = App()
        page._populate()
        self.layer.show('panel', 'text')
        return page

    def test_a_modal_view_fades_every_panel(self):
        page = self.page_with_app()

        page.app.containerManager.show(View(modal=True))

        assert self.layer.cover == 'modal'

    def test_a_view_that_is_not_modal_changes_nothing(self):
        page = self.page_with_app()

        page.app.containerManager.show(View(modal=False))

        assert self.layer.cover == ''

    def test_the_fade_goes_when_the_last_modal_view_closes(self):
        page = self.page_with_app()
        menu, help_window = View(modal=True), View(modal=True)
        page.app.containerManager.show(menu)
        page.app.containerManager.show(help_window)

        menu.close()
        faded = self.layer.cover
        help_window.close()

        assert (faded, self.layer.cover) == ('modal', '')

    def test_the_page_end_stops_following_modal_views(self):
        page = self.page_with_app()
        page._dispose()

        assert page.app.containerManager.onViewAddedToContainer.handlers == []

    def page_with_avatar(self):
        avatar = Avatar()
        sys.modules['BigWorld'].player = lambda: avatar
        self.populated_page()
        self.layer.show('panel', 'text')
        return avatar

    def test_panels_hide_while_the_camera_is_on_the_killer(self):
        avatar = self.page_with_avatar()

        avatar.inputHandler.onPostmortemKillerVisionEnter(42)

        assert self.layer.gui_hidden

    def test_panels_come_back_when_the_camera_leaves_the_killer(self):
        avatar = self.page_with_avatar()
        avatar.inputHandler.onPostmortemKillerVisionEnter(42)

        avatar.inputHandler.onPostmortemKillerVisionExit()

        assert not self.layer.gui_hidden

    def test_the_page_end_stops_following_the_killer_camera(self):
        avatar = self.page_with_avatar()
        self.control.page._dispose()

        assert avatar.inputHandler.onPostmortemKillerVisionEnter.handlers == []

    def test_panels_hide_under_the_loading_screen(self):
        self.page_with_avatar()

        self.control._on_loading(Event({'isShown': True}))

        assert self.layer.gui_hidden

    def test_panels_come_back_when_the_loading_screen_goes(self):
        self.page_with_avatar()
        self.control._on_loading(Event({'isShown': True}))

        self.control._on_loading(Event({'isShown': False}))

        assert not self.layer.gui_hidden

    def test_a_loading_screen_before_the_page_hides_the_panels_once_it_is_up(self):
        self.control._on_loading(Event({'isShown': True}))

        self.page_with_avatar()

        assert self.layer.gui_hidden

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


if __name__ == '__main__':
    unittest.main()
