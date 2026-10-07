# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.garage import run_in_order

# RU 1.45 client source: processors.module.MultipleModulesSeller and processors.tankman.TankmanDismiss.


def _seller(items):
    from gui.shared.gui_items.items_actions.actions import ItemSellSpec
    from gui.shared.gui_items.processors.module import MultipleModulesSeller
    specs = [ItemSellSpec(item['type_id'], item['cd'], item['count']) for item in items]
    return MultipleModulesSeller(specs)


def _dismisser(tankmen):
    from gui.shared.gui_items.processors.tankman import TankmanDismiss
    return TankmanDismiss(tankmen)


def sell(sale, tankmen, done):
    steps = []
    if sale['items']:
        steps.append(lambda: _seller(sale['items']))
    if tankmen:
        steps.append(lambda: _dismisser(tankmen))
    run_in_order(steps, done, 'depot sale')
