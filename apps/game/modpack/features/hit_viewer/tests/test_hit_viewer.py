# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import json
import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.core.storage import MemoryFile
from otmetki.features.hit_viewer.i18n import STRINGS
from otmetki.features.hit_viewer.model import (
    OWN_TARGET,
    SIDE_DEALT,
    SIDE_RECEIVED,
    HitBook,
    decode_message,
    default_index,
    first_plate,
    impact,
    marker,
    plate_analysis,
    settings_page,
    to_screen,
    viewer_state,
)
from otmetki.features.hit_viewer.settings import SCHEMA, SETTINGS

# RU 1.45 DamageFromShotDecoder.decodeSegment: effect code, part index, then a byte per axis for start and end.
HULL_PEN = 4 | (1 << 8) | (120 << 16) | (100 << 24) | (250 << 32) | (130 << 40) | (110 << 48) | (255 << 56)
TURRET_RICOCHET = 2 | (2 << 8) | (120 << 16) | (130 << 40)
NO_LENGTH = 4 | (1 << 8)
OWN = {'cd': 1, 'chassis': 11, 'turret': 12, 'gun': 13, 'name': u'ИС-7', 'class': 'heavy'}
ENEMY = {'cd': 2, 'chassis': 21, 'turret': None, 'gun': None, 'name': u'Maus', 'class': 'heavy'}
ATTACKER = 7


def translator():
    return _support.translator(STRINGS, 'ru')


def received(segments=(HULL_PEN,), other=ATTACKER):
    return {
        'side': SIDE_RECEIVED,
        'target': OWN_TARGET,
        'other': other,
        'vehicle': u'Maus',
        'class': 'heavyTank',
        'segments': list(segments),
        'shell': 'ap',
        'caliber': 128.0,
    }


def dealt(segments=(TURRET_RICOCHET,)):
    return {
        'side': SIDE_DEALT,
        'target': u'9',
        'other': 9,
        'vehicle': u'Maus',
        'class': 'heavyTank',
        'segments': list(segments),
        'shell': 'apcr',
        'caliber': 122,
    }


def started_book(store=None, keep=20):
    book = HitBook(store, keep)
    book.start(42, 1000.0, u'Химмельсдорф', u'ИС-7')
    book.target(OWN_TARGET, OWN)
    book.target(u'9', ENEMY)
    return book


def finished_battle():
    book = started_book()
    book.hit(received(), 1.0)
    book.damage(SIDE_RECEIVED, ATTACKER, 490, 1.2)
    book.hit(dealt(), 2.0)
    return book.finish(), book


class ImpactTest(unittest.TestCase):

    def test_the_last_drawn_point_names_the_part_and_outcome(self):
        assert impact([TURRET_RICOCHET, HULL_PEN]) == ('hull', 'pen')

    def test_points_without_length_are_not_drawn(self):
        assert impact([NO_LENGTH]) is None


class BookTest(unittest.TestCase):

    def test_a_hit_on_the_own_tank_is_recorded(self):
        book = started_book()

        assert book.hit(received(), 1.0)

    def test_a_hit_on_an_unknown_target_is_dropped(self):
        book = started_book()

        assert not book.hit(dict(received(), target=u'33'), 1.0)

    def test_damage_after_the_hit_reaches_it(self):
        battle, _ = finished_battle()

        assert battle['hits'][0]['damage'] == 490

    def test_damage_before_the_hit_waits_for_it(self):
        book = started_book()
        book.damage(SIDE_RECEIVED, ATTACKER, 300, 1.0)

        book.hit(received(), 1.3)

        assert book.current['hits'][0]['damage'] == 300

    def test_damage_of_another_vehicle_is_not_taken(self):
        book = started_book()
        book.hit(received(), 1.0)

        book.damage(SIDE_RECEIVED, 99, 300, 1.1)

        assert book.current['hits'][0]['damage'] == 0

    def test_a_ricochet_takes_no_damage(self):
        battle, _ = finished_battle()

        assert battle['hits'][1]['damage'] == 0

    def test_a_finished_battle_keeps_no_pairing_fields(self):
        battle, _ = finished_battle()

        assert 'other' not in battle['hits'][0]

    def test_the_shell_is_kept_with_its_caliber(self):
        battle, _ = finished_battle()

        assert (battle['hits'][0]['shell'], battle['hits'][0]['caliber']) == ('ap', 128)

    def test_a_battle_without_hits_is_not_kept(self):
        book = started_book()

        assert book.finish() is None

    def test_only_the_last_battles_are_kept(self):
        book = HitBook(None, 1)
        for battle_id in (1, 2):
            book.start(battle_id, 0.0)
            book.target(OWN_TARGET, OWN)
            book.hit(received(), 0.0)
            book.finish()

        assert [battle['id'] for battle in book.battles] == ['2']

    def test_a_saved_book_reads_back(self):
        store = MemoryFile()
        _, book = finished_battle()
        book.store = store
        book.save()

        again = HitBook(store, 20)

        assert again.battles[0]['hits'][1]['outcome'] == 'ricochet'

    def test_a_damaged_file_drops_the_broken_hits(self):
        battle, _ = finished_battle()
        battle['hits'].append({'side': 'sideways'})
        store = MemoryFile({'battles': [battle, 'junk']})

        book = HitBook(store, 20)

        assert len(book.battles[0]['hits']) == 2

    def test_measured_angle_and_armour_are_kept(self):
        _, book = finished_battle()

        book.measured(u'42', 0, {'angle': 34.5, 'armor': 242, 'nominal': 200})

        assert book.battle(u'42')['hits'][0]['armor'] == 242

    def test_an_unknown_battle_id_gives_the_latest(self):
        _, book = finished_battle()

        assert book.battle(u'nope')['id'] == '42'


class ArmorTest(unittest.TestCase):

    def test_a_plate_hit_straight_on_has_its_nominal_armour(self):
        assert plate_analysis(1.0, 120) == {'angle': 0.0, 'armor': 120, 'nominal': 120}

    def test_a_sloped_plate_is_thicker_along_the_shot(self):
        assert plate_analysis(0.5, 100)['armor'] == 200

    def test_the_angle_is_from_the_normal(self):
        assert plate_analysis(0.5, 100)['angle'] == 60.0

    def test_a_material_without_angle_keeps_its_nominal(self):
        assert plate_analysis(0.5, 100, uses_angle=False)['armor'] == 100

    def test_the_first_armoured_layer_is_measured(self):
        assert first_plate([(1.0, 0, True), (0.5, 80, True)])['nominal'] == 80

    def test_no_layers_give_nothing(self):
        assert first_plate([]) is None


class ProjectionTest(unittest.TestCase):

    def test_the_centre_of_the_clip_space_is_the_middle_of_the_screen(self):
        assert to_screen((0.0, 0.0, 0.5, 2.0)) == (0.5, 0.5)

    def test_up_in_clip_space_is_the_top_of_the_screen(self):
        assert to_screen((0.0, 1.0, 0.5, 1.0)) == (0.5, 0.0)

    def test_a_point_behind_the_camera_is_not_drawn(self):
        assert to_screen((0.0, 0.0, 0.5, -1.0)) is None

    def test_a_marker_without_a_tail_draws_no_line(self):
        found = marker(3, 'pen', (0.0, 0.0, 0.5, 1.0), (0.0, 0.0, 0.5, -1.0))

        assert (found['tx'], found['ty']) == (found['x'], found['y'])


class PageTest(unittest.TestCase):

    def test_the_first_side_with_hits_is_shown(self):
        battle, book = finished_battle()

        state = viewer_state(book.battles, {'battle': battle['id']}, translator())

        assert state['tab'] == SIDE_RECEIVED

    def test_a_row_shows_the_shell_with_its_caliber(self):
        battle, book = finished_battle()

        state = viewer_state(book.battles, {'battle': battle['id'], 'tab': SIDE_RECEIVED}, translator())

        assert state['rows'][0]['shell'] == u'ББ 128'

    def test_a_row_shows_the_damage_of_a_penetration(self):
        battle, book = finished_battle()

        state = viewer_state(book.battles, {'battle': battle['id'], 'tab': SIDE_RECEIVED}, translator())

        assert state['rows'][0]['damage'] == u'490'

    def test_an_unmeasured_angle_is_a_dash(self):
        battle, book = finished_battle()

        state = viewer_state(book.battles, {'battle': battle['id'], 'tab': SIDE_DEALT}, translator())

        assert state['rows'][0]['angle'] == u'—'

    def test_the_dealt_tab_counts_its_hits(self):
        battle, book = finished_battle()

        state = viewer_state(book.battles, {'battle': battle['id']}, translator())

        assert [tab['count'] for tab in state['tabs']] == [1, 1]

    def test_no_battles_give_an_empty_state(self):
        state = viewer_state([], {}, translator())

        assert state['battle'] is None

    def test_the_default_hit_of_a_tab_is_its_first(self):
        battle, _ = finished_battle()

        assert default_index(battle, SIDE_DEALT) == 1

    def test_the_state_is_json(self):
        battle, book = finished_battle()

        text = json.dumps(viewer_state(book.battles, {'battle': battle['id']}, translator()))

        assert u'Химмельсдорф' in json.loads(text)['battle']['map']

    def test_the_settings_page_opens_a_battle(self):
        _, book = finished_battle()

        page = settings_page(book.battles, translator())

        assert page['rows'][0]['actions'][0]['id'] == 'open'


class ProtocolTest(unittest.TestCase):

    def test_a_row_click_is_understood(self):
        assert decode_message('{"command": "select", "index": 3}') == ('select', {'index': 3})

    def test_an_unknown_tab_is_refused(self):
        assert decode_message('{"command": "tab", "tab": "both"}') is None

    def test_a_missing_field_is_refused(self):
        assert decode_message('{"command": "battle"}') is None

    def test_junk_is_refused(self):
        assert decode_message('{') is None


class SettingsTest(unittest.TestCase):

    def test_twenty_battles_are_kept_by_default(self):
        assert Settings(None, SCHEMA).get('keep_battles') == 20

    def test_the_switch_is_the_hangar_one(self):
        assert SETTINGS == ('hangar_hit_viewer',)

    def test_every_string_exists_in_both_languages(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


if __name__ == '__main__':
    unittest.main()
