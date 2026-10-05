# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.hud.panel import ATTACHED
from otmetki.core.settings import Settings
from otmetki.features.battle_loadout.i18n import STRINGS
from otmetki.features.battle_loadout.model import (
    clean_device,
    clean_devices,
    format_panel,
    icons_found,
    loadout_summary,
    overlay_of,
    slot_items,
    slots_line,
)
from otmetki.features.battle_loadout.model.preview import preview_text
from otmetki.features.battle_loadout.settings import SCHEMA, SETTINGS

ARTEFACTS = 'img://gui/maps/icons/artefact/'
BONUSES = 'img://gui/maps/icons/quests/bonuses/small/'


def turbocharger(**flags):
    raw = {'name': u'Турбонагнетатель', 'effect': u'+10 % к скорости', 'icon': ('turbocharger', 0, 0), 'bonus': True}
    raw.update(flags)
    return raw


def ventilation():
    icon = '../maps/icons/artefact/improvedVentilation.png'
    return {'name': u'Вентиляция', 'effect': None, 'icon': icon, 'deluxe': True}


def directive(**flags):
    raw = {'name': u'Директива', 'effect': u'Усиливает досылатель', 'icon': 'rammer', 'booster': 'boost'}
    raw.update(flags)
    return raw


def translator(language='ru'):
    return _support.translator(STRINGS, language)


class DeviceTest(unittest.TestCase):

    def test_a_device_gets_its_client_icon_effect_and_marks(self):
        device = clean_device(turbocharger())

        assert device == {
            'name': u'Турбонагнетатель',
            'effect': u'+10 % к скорости',
            'icon': ARTEFACTS + 'turbocharger.png|otmetki:module',
            'overlay': None,
            'kind': 'device',
            'empty': False,
            'bonus': True,
            'boosted': False,
            'attention': False,
            'active': False,
            'used': False,
        }

    def test_a_device_from_a_path_without_an_effect(self):
        device = clean_device(ventilation())

        assert device['icon'] == ARTEFACTS + 'improvedVentilation.png|otmetki:module'
        assert device['effect'] == u''

    def test_a_device_without_an_icon_gets_the_fallback_glyph(self):
        device = clean_device(turbocharger(icon=None))

        assert device['icon'] == 'otmetki:module'

    def test_nameless_and_broken_entries_are_dropped(self):
        raw = [turbocharger(), ventilation(), {'name': u'  ', 'icon': 'rammer'}, None]

        names = [device['name'] for device in clean_devices(raw)]

        assert names == [u'Турбонагнетатель', u'Вентиляция']

    def test_the_row_keeps_at_most_six_items(self):
        devices = clean_devices([turbocharger()] * 9)

        assert len(devices) == 6

    def test_no_devices_from_nothing(self):
        assert clean_devices(None) == []


class OverlayTest(unittest.TestCase):

    def test_a_deluxe_device_wears_the_plus_mark(self):
        assert overlay_of({'deluxe': True}) == BONUSES + 'equipmentPlus_overlay.png'

    def test_a_modernized_device_wears_the_mark_of_its_level(self):
        assert overlay_of({'modernized': True, 'level': 2}) == BONUSES + 'equipmentModernized_2_overlay.png'

    def test_a_modernized_level_out_of_range_gets_no_mark(self):
        assert overlay_of({'modernized': True, 'level': 9}) is None

    def test_an_upgraded_trophy_device_wears_the_upgraded_trophy_mark(self):
        assert overlay_of({'trophy': 'upgraded'}) == BONUSES + 'equipmentTrophyUpgraded_overlay.png'

    def test_a_plain_device_gets_no_mark(self):
        assert overlay_of({}) is None


class DirectiveTest(unittest.TestCase):

    def test_a_directive_wears_the_stock_frame_over_its_artefact_icon(self):
        device = clean_device(directive())

        assert device['overlay'] == ARTEFACTS + 'battleBooster_overlay.png'
        assert device['icon'] == ARTEFACTS + 'rammer.png|otmetki:module'

    def test_a_directive_without_effect_on_the_tank_carries_the_attention_mark(self):
        device = clean_device(directive(attention=True))

        assert device['attention']

    def test_a_crew_directive_for_an_unlearnt_skill_wears_the_replace_frame(self):
        overlay = overlay_of({'booster': 'replace', 'deluxe': True})

        assert overlay == ARTEFACTS + 'battleBooster_replace_overlay.png'

    def test_an_unknown_directive_frame_is_left_out(self):
        assert overlay_of({'booster': 'other'}) is None

    def test_the_device_the_directive_boosts_is_marked(self):
        device = clean_device(turbocharger(boosted=True))

        assert device['boosted']


class ActiveStateTest(unittest.TestCase):

    def test_a_running_device_is_active(self):
        device = clean_device(turbocharger(active=True))

        assert device['active']
        assert not device['used']

    def test_a_spent_device_is_used(self):
        device = clean_device(turbocharger(used=1))

        assert device['used'] is True
        assert not device['active']


class FormatTest(unittest.TestCase):

    def test_the_row_is_the_client_icons_alone(self):
        text = format_panel(clean_devices([turbocharger(bonus=False)]), Settings({}, SCHEMA))

        assert text == u'<img src="img://gui/maps/icons/artefact/turbocharger.png" width="48" height="48"/>'

    def test_an_old_own_icon_size_gives_way_to_the_stock_one(self):
        settings = Settings({'stock_size': False, 'icon_size': 40}, SCHEMA)

        text = format_panel(clean_devices([turbocharger(bonus=False)]), settings)

        assert 'width="48"' in text

    def test_empty_slots_draw_nothing_in_the_text_row(self):
        items = slot_items([turbocharger(bonus=False), None], [])

        text = format_panel(items, Settings({}, SCHEMA))

        assert text.count('<img') == 1

    def test_a_device_without_an_icon_keeps_a_mark_and_no_name(self):
        devices = clean_devices([turbocharger(icon=None, bonus=False)])

        text = format_panel(devices, Settings({}, SCHEMA))

        assert text == u'◆'

    def test_icons_carry_the_bonus_star_and_the_attention_mark_instead_of_names(self):
        devices = clean_devices([turbocharger(), directive(attention=True)])

        text = format_panel(devices, Settings({}, SCHEMA))

        assert u'★' in text
        assert u'!' in text
        assert u'Турбонагнетатель' not in text

    def test_the_preview_draws_every_sample_at_the_stock_size(self):
        text = preview_text(Settings({}, SCHEMA), translator())

        assert text.count('width="48"') == 5


class SettingsTest(unittest.TestCase):

    def test_switch(self):
        assert SETTINGS == ('battle_loadout',)

    def test_placed_above_the_left_half_of_the_stock_consumables(self):
        defaults = SCHEMA.defaults

        place = (defaults['x'], defaults['y'], defaults['align_x'], defaults['align_y'])

        assert place == (-120, -64, 'center', 'bottom')
        assert ATTACHED['otmetki.hud.battle_loadout'] == 'bar_left'

    def test_a_row_left_beside_the_consumables_moves_above_them(self):
        assert (-360, -8, 'center', 'bottom') in SCHEMA.retired

    def test_pinned_by_default(self):
        assert SCHEMA.defaults['pinned'] is True

    def test_an_older_default_place_is_retired(self):
        assert (-200, -66, 'center', 'bottom') in SCHEMA.retired

    def test_cells_are_always_as_large_as_the_stock_slots(self):
        assert Settings({'stock_size': False}, SCHEMA).get('stock_size') is True

    def test_the_own_icon_size_is_no_option(self):
        assert 'icon_size' not in SCHEMA.defaults


class SummaryTest(unittest.TestCase):

    def test_a_read_counts_the_devices_the_directives_and_the_icons_the_client_has(self):
        loadout = {
            'devices': [turbocharger(), ventilation(), None],
            'directives': [directive()],
            'reason': None,
            'source': 'setups',
            'slots': [2305, 1017, 0],
        }
        items = slot_items(loadout['devices'], loadout['directives'])

        summary = loadout_summary(loadout, items, lambda path: 'rammer' not in path)

        slots = 'slots from setups: 1 2305, 2 1017, 3 empty'
        assert summary == 'battle_loadout: 2 devices, 1 directives, icons found 2; ' + slots

    def test_an_empty_read_says_why(self):
        loadout = {'devices': [], 'directives': [], 'reason': 'no vehicle yet'}

        summary = loadout_summary(loadout, [], lambda path: True)

        assert summary == 'battle_loadout: nothing to show, no vehicle yet'

    def test_a_glyph_without_a_client_image_is_not_a_found_icon(self):
        devices = clean_devices([turbocharger(icon=None)])

        assert icons_found(devices, lambda path: True) == 0


class SlotTest(unittest.TestCase):

    def test_an_empty_device_slot_gets_no_cell(self):
        items = slot_items([turbocharger(), None, ventilation()], [])

        assert [item['name'] for item in items] == [turbocharger()['name'], ventilation()['name']]

    def test_an_empty_directive_slot_gets_no_cell(self):
        items = slot_items([turbocharger(), ventilation(), turbocharger(icon='rammer')], [None])

        assert len(items) == 3
        assert all(item['kind'] == 'device' for item in items)

    def test_no_cell_is_ever_empty(self):
        items = slot_items([None, turbocharger(), None], [None, directive()])

        assert [item['empty'] for item in items] == [False, False]

    def test_the_third_device_is_kept(self):
        items = slot_items([turbocharger(), ventilation(), turbocharger(icon='rammer')], [])

        assert len(items) == 3

    def test_a_directive_is_a_directive_cell(self):
        items = slot_items([], [directive()])

        assert items[0]['kind'] == 'directive'

    def test_a_directive_follows_the_devices(self):
        items = slot_items([turbocharger()], [directive()])

        assert [item['kind'] for item in items] == ['device', 'directive']

    def test_a_nameless_device_gets_no_cell(self):
        assert slot_items([{'name': u' ', 'icon': 'rammer'}], []) == []

    def test_the_log_names_each_slot(self):
        line = slots_line('arena', [2305, 0])

        assert line == 'slots from arena: 1 2305, 2 empty'


if __name__ == '__main__':
    unittest.main()
