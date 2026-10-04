# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.battle_loadout.i18n import STRINGS
from otmetki.features.battle_loadout.model import clean_devices
from otmetki.features.battle_loadout.model.constants import PREVIEW_DEVICES
from otmetki.features.battle_loadout.model.preview import preview_widget
from otmetki.features.battle_loadout.model.widget import equipment_widget
from otmetki.features.battle_loadout.settings import SCHEMA


def translator():
    return _support.translator(STRINGS)


def preview_data():
    return equipment_widget(clean_devices(PREVIEW_DEVICES), Settings({}, SCHEMA))['data']


class EquipmentWidgetTest(unittest.TestCase):

    def test_icons_and_cells_take_the_stock_slot_size_by_default(self):
        data = preview_data()

        assert data['size'] == 48
        assert data['cell'] == 52
        assert data['gap'] == 5

    def test_an_old_own_icon_size_gives_way_to_the_stock_slot_size(self):
        settings = Settings({'stock_size': False, 'icon_size': 30}, SCHEMA)

        data = equipment_widget(clean_devices(PREVIEW_DEVICES), settings)['data']

        assert data['size'] == 48

    def test_every_sample_item_is_drawn(self):
        items = preview_data()['items']

        assert len(items) == 5

    def test_an_item_carries_its_icon_and_the_tooltip_name(self):
        first = preview_data()['items'][0]

        assert first['icon'] == 'img://gui/maps/icons/artefact/turbocharger.png|otmetki:module'
        assert first['name'] == u'Турбонагнетатель'

    def test_marks_of_the_sample_items(self):
        items = preview_data()['items']

        assert items[0]['bonus']
        assert items[1]['overlay'] == 'img://gui/maps/icons/quests/bonuses/small/equipmentPlus_overlay.png'
        assert items[2]['boosted']
        assert items[3]['active']
        assert items[4]['overlay'] == 'img://gui/maps/icons/artefact/battleBooster_overlay.png'

    def test_the_row_carries_only_the_items_and_their_size(self):
        assert sorted(preview_data()) == ['cell', 'gap', 'items', 'size']

    def test_fixture_for_the_page(self):
        widget = preview_widget(Settings({}, SCHEMA), translator())

        assert _support.widget_fixture('battle_loadout', widget)


if __name__ == '__main__':
    unittest.main()
