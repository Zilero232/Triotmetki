# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import sys
import types
import unittest

import _support
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer, panel_schema
from _support import MemoryFile

STUBBED = (
    'BigWorld',
    'gui',
    'gui.Scaleform',
    'gui.Scaleform.daapi',
    'gui.Scaleform.daapi.view',
    'gui.Scaleform.daapi.view.battle',
    'gui.Scaleform.daapi.view.battle.shared',
    'gui.Scaleform.daapi.view.battle.shared.page',
    'gui.Scaleform.daapi.view.meta',
    'gui.Scaleform.daapi.view.meta.PrebattleAmmunitionPanelViewMeta',
    'gui.mods',
    'gui.mods.gambiter',
    'gui.mods.gambiter.flash',
    'frameworks',
    'frameworks.wulf',
    'helpers',
    'helpers.dependency',
    'skeletons',
    'skeletons.gui',
    'skeletons.gui.impl',
)
HOOKED = ('_populate', '_dispose', '_setComponentsVisibility')
SETUPS_HOOKED = ('as_showS', 'as_hideS')
FULLSCREEN_WINDOW = 1 | 1024
DIALOG = 17
POP_OVER = 33
CLIENT_MODULES = ('otmetki.core.client.hud', 'otmetki.core.client.timer')


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


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


class SharedPage(object):

    def __init__(self, full_stats_alias='fullStats', visible=()):
        self._fullStatsAlias = full_stats_alias
        self.visible = set(visible)
        self.gui_visible = True
        self.disposed = False

    def _populate(self):
        return 'populated'

    def _dispose(self):
        self.disposed = True
        return 'disposed'

    def _setComponentsVisibility(self, visible=None, hidden=None):
        self.visible = (self.visible | set(visible or ())) - set(hidden or ())

    def as_getComponentsVisibilityS(self):
        return list(self.visible)

    def as_isComponentVisibleS(self, alias):
        return alias in self.visible

    def isGuiVisible(self):
        return self.gui_visible

    def isDisposed(self):
        return self.disposed


class PrebattleAmmunitionPanelViewMeta(object):

    def as_showS(self):
        return 'shown'

    def as_hideS(self, useAnim):
        return 'hidden'


class Window(object):

    def __init__(self, flags, status='LOADED'):
        self.windowFlags = flags
        self.windowStatus = status


class WindowsManager(object):

    def __init__(self):
        self.onWindowStatusChanged = ClientEvent()
        self.windows = []

    def findWindows(self, predicate):
        return [window for window in self.windows if predicate(window)]

    def open(self, window):
        self.windows.append(window)
        self.onWindowStatusChanged(id(window), 'LOADED')

    def close(self, window):
        self.windows.remove(window)
        self.onWindowStatusChanged(id(window), 'DESTROYED')


class InputHandler(object):

    def __init__(self):
        self.onPostmortemKillerVisionEnter = ClientEvent()
        self.onPostmortemKillerVisionExit = ClientEvent()


class Avatar(object):

    def __init__(self):
        self.inputHandler = InputHandler()


class Event(object):

    def __init__(self, ctx):
        self.ctx = ctx


class Backend(HudBackend):

    def available(self):
        return True

    def create(self, alias, props):
        return True

    def delete(self, alias):
        return True


class Callbacks(object):

    def __init__(self):
        self.pending = []

    def __call__(self, delay, callback):
        self.pending.append(callback)

    def run(self):
        pending = self.pending
        self.pending = []
        for callback in pending:
            callback()


def install_stubs(callbacks, manager):
    forget_client_modules()
    saved = {name: sys.modules.get(name) for name in STUBBED}
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    sys.modules['BigWorld'].player = lambda: None
    sys.modules['BigWorld'].callback = callbacks
    sys.modules['BigWorld'].time = lambda: 0.0
    sys.modules['gui.Scaleform.daapi.view.battle.shared.page'].SharedPage = SharedPage
    setups = sys.modules['gui.Scaleform.daapi.view.meta.PrebattleAmmunitionPanelViewMeta']
    setups.PrebattleAmmunitionPanelViewMeta = PrebattleAmmunitionPanelViewMeta
    sys.modules['frameworks.wulf'].WindowStatus = Namespace(DESTROYING='DESTROYING', DESTROYED='DESTROYED')
    sys.modules['helpers'].dependency = sys.modules['helpers.dependency']
    sys.modules['helpers.dependency'].instance = lambda interface: Namespace(windowsManager=manager)
    sys.modules['skeletons.gui.impl'].IGuiLoader = object
    return saved


def restore_stubs(saved):
    for name, module in saved.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module
    forget_client_modules()


def forget_client_modules():
    _support.forget_modules(CLIENT_MODULES)


class CoverWatchTest(unittest.TestCase):

    def setUp(self):
        self.callbacks = Callbacks()
        self.manager = WindowsManager()
        self.saved = install_stubs(self.callbacks, self.manager)
        self.originals = {name: SharedPage.__dict__[name] for name in HOOKED}
        self.setups_originals = {
            name: PrebattleAmmunitionPanelViewMeta.__dict__[name] for name in SETUPS_HOOKED
        }
        from otmetki.core.client.hud.cover import CoverWatch
        self.layer = HudLayer(Backend(), ComponentConfig(MemoryFile()))
        self.layer.register('panel', panel_schema({}))
        self.layer.register('battle_loadout', panel_schema({}))
        self.switch = {'value': True}
        self.watch = CoverWatch(self.layer, lambda: self.switch['value'])
        assert self.watch.install()

    def tearDown(self):
        for name, value in self.originals.items():
            setattr(SharedPage, name, value)
        for name, value in self.setups_originals.items():
            setattr(PrebattleAmmunitionPanelViewMeta, name, value)
        restore_stubs(self.saved)

    def battle_page(self, full_stats_alias='fullStats', visible=()):
        page = SharedPage(full_stats_alias, visible)
        page._populate()
        self.layer.show('panel', 'text')
        return page

    def alive_page(self):
        return self.battle_page(visible={'consumablesPanel', 'minimap', 'teamBasesPanel'})

    def test_death_takes_the_consumables_panel_and_the_equipment_row_with_it(self):
        page = self.alive_page()

        page._setComponentsVisibility(hidden={'consumablesPanel'})

        assert self.layer.stock_hidden == frozenset(('consumablesPanel',))

    def test_a_respawn_brings_the_consumables_panel_back(self):
        page = self.alive_page()
        page._setComponentsVisibility(hidden={'consumablesPanel'})

        page._setComponentsVisibility(visible={'consumablesPanel'})

        assert self.layer.stock_hidden == frozenset()

    def test_the_video_camera_hides_the_consumables_panel(self):
        page = self.alive_page()

        page._setComponentsVisibility(hidden={'damagePanel', 'battleDamageLogPanel', 'consumablesPanel'})

        assert self.layer.stock_hidden == frozenset(('consumablesPanel',))
        assert self.layer.covers == frozenset()

    def test_a_page_that_starts_after_death_has_the_consumables_hidden_at_once(self):
        self.battle_page(visible={'teamBasesPanel', 'minimap'})

        assert self.layer.stock_hidden == frozenset(('consumablesPanel',))

    def test_the_check_puts_right_a_consumables_change_it_missed(self):
        page = self.alive_page()
        page._setComponentsVisibility(visible={'fullStats'})
        page.visible.discard('consumablesPanel')

        self.callbacks.run()

        assert 'consumablesPanel' in self.layer.stock_hidden

    def test_the_pre_battle_setups_panel_hides_the_consumables_panel(self):
        self.alive_page()

        PrebattleAmmunitionPanelViewMeta().as_showS()

        assert self.layer.stock_hidden == frozenset(('consumablesPanel',))

    def test_the_consumables_come_back_when_the_battle_starts(self):
        self.alive_page()
        setups = PrebattleAmmunitionPanelViewMeta()
        setups.as_showS()

        assert setups.as_hideS(True) == 'hidden'
        assert self.layer.stock_hidden == frozenset()

    def test_a_client_without_the_setups_panel_says_so_in_the_log(self):
        cover_module = sys.modules['otmetki.core.client.hud.cover']
        lines = []
        saved = cover_module.PrebattleAmmunitionPanelViewMeta, cover_module.log
        cover_module.PrebattleAmmunitionPanelViewMeta, cover_module.log = None, lines.append
        try:
            self.watch._follow_setups()
        finally:
            cover_module.PrebattleAmmunitionPanelViewMeta, cover_module.log = saved

        assert len(lines) == 1
        assert 'setups' in lines[0]

    def test_the_page_end_gives_every_followed_component_back(self):
        page = self.alive_page()
        page._setComponentsVisibility(hidden={'consumablesPanel'})
        PrebattleAmmunitionPanelViewMeta().as_showS()

        page._dispose()

        assert self.layer.stock_hidden == frozenset()

    def test_tab_hides_the_panels(self):
        page = self.battle_page()

        page._setComponentsVisibility(visible={'fullStats'}, hidden={'damagePanel', 'teamBasesPanel'})

        assert self.layer.gui_hidden

    def test_the_page_hiding_its_hud_hides_the_panels_whatever_the_overlay(self):
        page = self.battle_page()

        page._setComponentsVisibility(visible={'questsProgressNewTab'}, hidden={'teamBasesPanel', 'minimap'})

        assert self.layer.gui_hidden

    def test_the_page_showing_its_hud_again_brings_the_panels_back(self):
        page = self.battle_page()
        page._setComponentsVisibility(hidden={'teamBasesPanel', 'minimap'})

        page._setComponentsVisibility(visible={'teamBasesPanel', 'minimap'})

        assert not self.layer.gui_hidden

    def test_a_full_stats_key_the_page_ignored_leaves_the_panels(self):
        self.battle_page()

        self.watch._on_overlay_key(Event({'isDown': True}))
        self.callbacks.run()

        assert not self.layer.gui_hidden

    def test_closing_the_full_stats_brings_the_panels_back(self):
        page = self.battle_page()
        page._setComponentsVisibility(visible={'fullStats'})

        page._setComponentsVisibility(visible={'damagePanel'}, hidden={'fullStats'})

        assert not self.layer.gui_hidden

    def test_the_event_stats_hide_the_panels(self):
        page = self.battle_page(full_stats_alias=None)

        page._setComponentsVisibility(visible={'eventStats'})

        assert self.layer.gui_hidden

    def test_the_frontline_respawn_screen_hides_the_panels(self):
        page = self.battle_page()

        page._setComponentsVisibility(visible={'epicRespawnView'}, hidden={'damagePanel'})

        assert self.layer.gui_hidden

    def test_the_radial_menu_leaves_the_panels(self):
        page = self.battle_page()

        page._setComponentsVisibility(visible={'radialMenu'})

        assert self.layer.covers == frozenset()

    def test_the_page_keeps_its_own_visibility_call(self):
        page = self.battle_page()

        page._setComponentsVisibility(visible={'fullStats'}, hidden={'damagePanel'})

        assert page.visible == {'fullStats'}

    def test_a_missed_close_is_put_right_by_the_next_check(self):
        page = self.battle_page()
        page._setComponentsVisibility(visible={'fullStats'})
        page.visible = set()

        self.callbacks.run()

        assert not self.layer.gui_hidden

    def test_the_check_keeps_an_overlay_the_page_still_shows(self):
        page = self.battle_page()
        page._setComponentsVisibility(visible={'fullStats'})

        self.callbacks.run()

        assert self.layer.gui_hidden

    def test_nothing_is_checked_while_nothing_covers_the_battle(self):
        self.battle_page()

        assert self.callbacks.pending == []

    def test_a_full_screen_gameface_window_hides_the_panels(self):
        self.battle_page()

        self.manager.open(Window(FULLSCREEN_WINDOW))

        assert self.layer.gui_hidden

    def test_a_dialog_window_leaves_the_panels(self):
        self.battle_page()

        self.manager.open(Window(DIALOG))

        assert self.layer.covers == frozenset()

    def test_a_pop_over_leaves_the_panels(self):
        self.battle_page()

        self.manager.open(Window(POP_OVER))

        assert self.layer.covers == frozenset()

    def test_the_panels_come_back_when_the_window_closes(self):
        self.battle_page()
        window = Window(FULLSCREEN_WINDOW)
        self.manager.open(window)

        self.manager.close(window)

        assert not self.layer.gui_hidden

    def test_a_window_open_when_the_page_appears_covers_it_at_once(self):
        self.manager.windows.append(Window(FULLSCREEN_WINDOW))

        self.battle_page()

        assert self.layer.gui_hidden

    def test_panels_hide_with_the_stock_gui(self):
        self.battle_page()

        self.watch._on_gui_visibility(Event({'visible': False}))

        assert self.layer.gui_hidden

    def test_panels_come_back_with_the_stock_gui(self):
        self.battle_page()
        self.watch._on_gui_visibility(Event({'visible': False}))

        self.watch._on_gui_visibility(Event({'visible': True}))

        assert not self.layer.gui_hidden

    def test_panels_hide_under_the_loading_screen(self):
        self.battle_page()

        self.watch._on_loading(Event({'isShown': True}))

        assert self.layer.gui_hidden

    def test_panels_come_back_when_the_loading_screen_goes(self):
        self.battle_page()
        self.watch._on_loading(Event({'isShown': True}))

        self.watch._on_loading(Event({'isShown': False}))

        assert not self.layer.gui_hidden

    def test_a_loading_screen_before_the_page_hides_the_panels_once_it_is_up(self):
        self.watch._on_loading(Event({'isShown': True}))

        self.battle_page()

        assert self.layer.gui_hidden

    def test_panels_hide_while_the_camera_is_on_the_killer(self):
        avatar = Avatar()
        sys.modules['BigWorld'].player = lambda: avatar
        self.battle_page()

        avatar.inputHandler.onPostmortemKillerVisionEnter(42)

        assert self.layer.gui_hidden

    def test_panels_come_back_when_the_camera_leaves_the_killer(self):
        avatar = Avatar()
        sys.modules['BigWorld'].player = lambda: avatar
        self.battle_page()
        avatar.inputHandler.onPostmortemKillerVisionEnter(42)

        avatar.inputHandler.onPostmortemKillerVisionExit()

        assert not self.layer.gui_hidden

    def test_the_switch_off_leaves_the_panels_under_tab(self):
        page = self.battle_page()
        self.switch['value'] = False

        page._setComponentsVisibility(visible={'fullStats'})

        assert not self.layer.gui_hidden

    def test_the_switch_off_still_hides_the_panels_with_the_stock_gui(self):
        self.battle_page()
        self.switch['value'] = False

        self.watch._on_gui_visibility(Event({'visible': False}))

        assert self.layer.gui_hidden

    def test_the_page_end_uncovers_every_panel(self):
        page = self.battle_page()
        page._setComponentsVisibility(visible={'fullStats', 'epicRespawnView'})

        page._dispose()

        assert self.layer.covers == frozenset()

    def test_the_page_end_stops_following_the_windows(self):
        page = self.battle_page()

        page._dispose()

        assert self.manager.onWindowStatusChanged.handlers == []

    def test_the_page_end_stops_following_the_killer_camera(self):
        avatar = Avatar()
        sys.modules['BigWorld'].player = lambda: avatar
        page = self.battle_page()

        page._dispose()

        assert avatar.inputHandler.onPostmortemKillerVisionEnter.handlers == []

    def test_a_new_page_starts_uncovered(self):
        page = self.battle_page()
        page._setComponentsVisibility(visible={'fullStats'})

        self.battle_page()

        assert self.layer.covers == frozenset()

    def test_a_page_disposed_without_its_dispose_call_uncovers_on_the_check(self):
        page = self.battle_page()
        page._setComponentsVisibility(visible={'fullStats'})
        page.disposed = True

        self.callbacks.run()

        assert self.layer.covers == frozenset()

    def test_a_failing_layer_update_uncovers_every_panel(self):
        page = self.battle_page()
        page._setComponentsVisibility(visible={'fullStats'})
        failing = {'calls': 0}
        original = self.layer.set_cover

        def set_cover(reason, on):
            failing['calls'] += 1
            if failing['calls'] == 1:
                raise RuntimeError('backend gone')
            return original(reason, on)

        self.layer.set_cover = set_cover

        page._setComponentsVisibility(visible={'epicRespawnView'})

        assert self.layer.covers == frozenset()


class GuiFlashCoverTest(unittest.TestCase):

    def setUp(self):
        self.saved = install_stubs(Callbacks(), WindowsManager())
        self.updates = []
        flash = Namespace(
            createComponent=lambda alias, kind, props: self.updates.append(dict(props)),
            updateComponent=lambda alias, props: self.updates.append(dict(props)),
            deleteComponent=lambda alias: None,
        )
        sys.modules['gui.mods.gambiter'].g_guiFlash = flash
        sys.modules['gui.mods.gambiter.flash'].COMPONENT_TYPE = Namespace(LABEL='label')
        from otmetki.core.client.hud.guiflash import GuiFlashBackend
        self.backend = GuiFlashBackend()

    def tearDown(self):
        restore_stubs(self.saved)

    def test_a_covered_label_is_hidden(self):
        self.backend.create('otmetki.hud.panel', {'text': 'x', 'visible': True, 'cover': ''})

        self.backend.update('otmetki.hud.panel', {'cover': 'stats'})

        assert self.updates[-1] == {'visible': False}

    def test_the_label_comes_back_when_the_cover_goes(self):
        self.backend.create('otmetki.hud.panel', {'text': 'x', 'visible': True, 'cover': 'modal'})

        self.backend.update('otmetki.hud.panel', {'cover': ''})

        assert self.updates[-1] == {'visible': True}

    def test_a_label_created_under_a_cover_starts_hidden(self):
        self.backend.create('otmetki.hud.panel', {'text': 'x', 'visible': True, 'cover': 'stats'})

        assert self.updates[-1]['visible'] is False


if __name__ == '__main__':
    unittest.main()
