# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import sys
import types
import unittest

import _support  # noqa: F401
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer
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
    'gui.Scaleform.daapi.view.battle.shared.consumables_panel',
    'gui.Scaleform.daapi.view.battle.shared.minimap',
    'gui.Scaleform.daapi.view.battle.shared.minimap.component',
)
HOOKED = {
    'SharedPage': ('_populate', '_dispose', '_setComponentsVisibility'),
    'ConsumablesPanel': ('_addShellSlot', '_reset'),
    'MinimapComponent': ('applyNewSize',),
}


class SharedPage(object):

    def __init__(self, components=None):
        self.components = components or {}

    def _populate(self):
        return 'populated'

    def _dispose(self):
        return 'disposed'

    def _setComponentsVisibility(self, visible=None, hidden=None):
        return None

    def as_setComponentsVisibilityS(self, visible, hidden):
        return None


class ConsumablesPanel(object):

    def __init__(self, mask):
        self._mask = mask

    def _addShellSlot(self, *args):
        self._mask |= 1 << 10

    def _reset(self):
        self._mask = 0


class MinimapComponent(object):

    def applyNewSize(self, sizeIndex):
        return sizeIndex


CLASSES = {'SharedPage': SharedPage, 'ConsumablesPanel': ConsumablesPanel, 'MinimapComponent': MinimapComponent}


class Backend(HudBackend):

    def available(self):
        return True


def install_stubs():
    saved = dict((name, sys.modules.get(name)) for name in STUBBED)
    for name in STUBBED:
        sys.modules[name] = types.ModuleType(str(name))
    sys.modules['BigWorld'].player = lambda: None
    sys.modules['gui.Scaleform.daapi.view.battle.shared.page'].SharedPage = SharedPage
    sys.modules['gui.Scaleform.daapi.view.battle.shared.consumables_panel'].ConsumablesPanel = ConsumablesPanel
    sys.modules['gui.Scaleform.daapi.view.battle.shared.minimap.component'].MinimapComponent = MinimapComponent
    return saved


def restore_stubs(saved):
    for name, module in saved.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module
    for name in [name for name in sys.modules if name.startswith('otmetki.core.client.hud')]:
        del sys.modules[name]


class StockMetricsTest(unittest.TestCase):

    def setUp(self):
        self.saved = install_stubs()
        self.originals = dict(
            ((owner, name), CLASSES[owner].__dict__[name]) for owner, names in HOOKED.items() for name in names
        )
        from otmetki.core.client.hud.stock import StockControl
        self.layer = HudLayer(Backend(), ComponentConfig(MemoryFile()))
        self.control = StockControl(self.layer, EventBus())
        assert self.control.install()

    def tearDown(self):
        for (owner, name), value in self.originals.items():
            setattr(CLASSES[owner], name, value)
        restore_stubs(self.saved)

    def battle_page(self, mask):
        panel = ConsumablesPanel(mask)
        page = SharedPage({'consumablesPanel': panel})
        page._populate()
        return page, panel

    def test_the_bar_is_measured_when_the_page_appears(self):
        self.battle_page(0b1111)

        assert self.layer.metrics['bar'] == 4 * 57

    def test_a_slot_the_panel_adds_is_measured_again(self):
        _, panel = self.battle_page(0b1111)

        panel._addShellSlot()

        assert self.layer.metrics['bar'] == 5 * 57

    def test_the_bar_is_measured_again_when_the_page_shows_it_after_a_respawn(self):
        page, panel = self.battle_page(0b1111)
        panel._mask = 0b111111

        page._setComponentsVisibility(visible={'consumablesPanel'})

        assert self.layer.metrics['bar'] == 6 * 57

    def test_other_components_leave_the_measure(self):
        page, panel = self.battle_page(0b1111)
        panel._mask = 0b111111

        page._setComponentsVisibility(visible={'damagePanel'})

        assert self.layer.metrics['bar'] == 4 * 57

    def test_a_minimap_resized_in_battle_moves_what_sits_above_it(self):
        self.battle_page(0b1111)

        MinimapComponent().applyNewSize(4)

        assert self.layer.metrics['minimap'] == 490

    def test_the_resized_minimap_keeps_the_measured_bar(self):
        self.battle_page(0b1111)

        MinimapComponent().applyNewSize(0)

        assert (self.layer.metrics['bar'], self.layer.metrics['minimap']) == (4 * 57, 210)

    def test_a_new_page_reads_the_minimap_setting_again(self):
        self.battle_page(0b1111)
        MinimapComponent().applyNewSize(0)

        self.battle_page(0b1111)

        assert self.layer.metrics['minimap'] == 310


if __name__ == '__main__':
    unittest.main()
