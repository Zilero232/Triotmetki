# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import shutil
import struct
import tempfile
import time
import unittest

import _support
from otmetki.core.replay_file import MAGIC, read_header
from otmetki.core.storage import MemoryFile
from otmetki.features.replay_manager.i18n import STRINGS
from otmetki.features.replay_manager.model import (
    AnalysisWatch,
    AutoNamer,
    ItemCache,
    PageContext,
    ReplayActionError,
    ReplayLibrary,
    UploadedIndex,
    analysis_notice,
    battle_type,
    build_page,
    compatible,
    find_own,
    item_of,
    launch_request,
    name_values,
    page_status,
    parse_statuses,
    pending_launch,
    play_refusal,
    rename_target,
    render_name,
    stop_on_teardown,
    vehicle_label,
    vehicle_parts,
    version_key,
)
from otmetki.features.replay_manager.model.constants import (
    ANALYSIS_IDS_PER_READ,
    ANALYSIS_WATCH_S,
    AUTO_NAME_INDEX_S,
    FAVOURITES_MAX,
    INDEX_MAX,
    LAUNCH_TTL_S,
    SCAN_MAX_FILES,
)
from otmetki.features.replay_manager.settings import SCHEMA, SETTINGS

ACCOUNT = 1234
CLIENT = '1.45.0.0'
UPLOADED_ID = '7b0c2a44-1111-4111-8111-111111111111'
PARSED_ID = '0f8e2d4c-6b1a-4f3e-9d2c-7a5b3c1d9e8f'
PARSING_ID = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d'
EXAMPLE_ACCOUNT = 12345678
PAGE_FIXTURE = os.path.join(
    _support.MODPACK_DIR,
    'ui-web',
    'src',
    'entities',
    'replay',
    'replay',
    '_tests',
    'fixtures',
    'replays-page.sample.json',
)
STARTED = time.mktime((2026, 9, 27, 14, 5, 0, 0, 0, -1))


def replay_bytes(player_id, arena_id=None, results=None, version=CLIENT):
    arena = {
        'playerID': player_id,
        'dateTime': '27.09.2026 14:05:00',
        'mapName': '05_prohorovka',
        'mapDisplayName': u'Прохоровка',
        'playerVehicle': 'ussr-R04_T-34',
        'battleType': 1,
        'gameplayID': 'ctf',
        'clientVersionFromExe': version,
    }
    if arena_id is not None:
        arena['arenaUniqueID'] = arena_id
    blocks = [json.dumps(arena).encode('utf-8')]
    if results is not None:
        blocks.append(json.dumps(results).encode('utf-8'))

    data = struct.pack(str('<II'), MAGIC, len(blocks))
    for block in blocks:
        data += struct.pack(str('<I'), len(block)) + block
    return data + b'\x00' * 32


def own_vehicle_results(team):
    return {
        'team': team,
        'damageDealt': 2150,
        'damageAssistedRadio': 400,
        'damageAssistedTrack': 120,
        'damageAssistedStun': 0,
        'kills': 2,
        'xp': 1150,
        'originalXP': 575,
        'credits': 45000,
        'spotted': 3,
        'markOfMastery': 2,
        'marksOnGun': 1,
        'shots': 9,
        'directEnemyHits': 8,
        'piercingEnemyHits': 7,
        'damageReceived': 900,
        'damageBlockedByArmor': 1200,
        'lifeTime': 400,
        'typeCompDescr': 1,
        'deathReason': -1,
    }


def own_results(arena_id, team=2, winner=2):
    common = {'winnerTeam': winner, 'duration': 402, 'bonusType': 1, 'finishReason': 1}
    personal = {'avatar': {'team': team}, '1': own_vehicle_results(team)}
    other_players = {'9': [{'damageDealt': 99999}]}
    return [{'arenaUniqueID': arena_id, 'common': common, 'personal': personal, 'vehicles': other_players}, {}, {}]


def own_replay_bytes(arena_id):
    return replay_bytes(ACCOUNT, arena_id, results=own_results(arena_id))


class Folder(object):

    def __init__(self):
        self.path = tempfile.mkdtemp()

    def write(self, name, data, mtime):
        path = os.path.join(self.path, name)
        with open(path, 'wb') as handle:
            handle.write(data)
        os.utime(path, (mtime, mtime))
        return path

    def remove(self):
        shutil.rmtree(self.path, ignore_errors=True)


def names_of(replays):
    return [replay['name'] for replay in replays]


def read_all(library):
    library.index(time.time, budget_s=60)


class FileInfo(object):

    def __init__(self, number):
        self.st_size = 10
        self.st_mtime = float(number)


class LibraryTest(unittest.TestCase):

    def setUp(self):
        self.folder = Folder()
        self.folder.write('own_new.mtreplay', own_replay_bytes(111), 200)
        self.folder.write('own_old.wotreplay', replay_bytes(ACCOUNT), 100)
        self.folder.write('other.mtreplay', replay_bytes(999, 222), 300)
        self.folder.write('temp.mtreplay', replay_bytes(ACCOUNT, 333), 400)
        self.folder.write('broken.mtreplay', b'nope', 500)
        self.folder.write('notes.txt', b'x', 600)
        self.reads = []

    def tearDown(self):
        self.folder.remove()

    def read(self, path):
        self.reads.append(os.path.basename(path))
        return read_header(path)

    def library(self, store=None):
        library = ReplayLibrary(store or MemoryFile(), self.read)
        library.scan(self.folder.path)
        return library

    def test_a_scan_lists_the_replays_to_read(self):
        library = self.library()

        self.assertTrue(library.indexing())
        self.assertEqual(library.progress(), (0, 4))
        self.assertEqual(library.replays(ACCOUNT), [])

    def test_only_own_replays_newest_first_after_indexing(self):
        library = self.library()

        read_all(library)

        replays = library.replays(ACCOUNT)
        self.assertFalse(library.indexing())
        self.assertEqual(library.progress(), (4, 4))
        self.assertEqual(names_of(replays), ['own_new.mtreplay', 'own_old.wotreplay'])
        self.assertEqual(replays[0]['header']['arena_unique_id'], '111')
        self.assertEqual(replays[0]['header']['stats']['kills'], 2)

    def test_no_replays_without_an_account(self):
        library = self.library()
        read_all(library)

        self.assertEqual(library.replays(None), [])

    def test_index_reads_at_least_one_file_per_slice(self):
        library = self.library()

        done = library.index(lambda: 0.0 if not self.reads else 10.0, budget_s=1)

        self.assertEqual(done, 1)
        self.assertEqual(library.progress(), (1, 4))

    def test_save_writes_only_after_a_change(self):
        library = self.library()
        read_all(library)

        self.assertTrue(library.save())
        self.assertFalse(library.save())

    def test_saved_headers_are_not_read_again(self):
        store = MemoryFile()
        library = self.library(store)
        read_all(library)
        library.save()
        count = len(self.reads)

        again = self.library(store)

        self.assertFalse(again.indexing())
        self.assertEqual(len(self.reads), count)
        self.assertEqual(names_of(again.replays(ACCOUNT)), ['own_new.mtreplay', 'own_old.wotreplay'])

    def test_only_a_changed_file_is_read_again(self):
        store = MemoryFile()
        library = self.library(store)
        read_all(library)
        library.save()
        count = len(self.reads)
        again = self.library(store)
        self.folder.write('own_old.wotreplay', replay_bytes(ACCOUNT, 555), 150)

        again.scan(self.folder.path)
        read_all(again)

        self.assertEqual(self.reads[count:], ['own_old.wotreplay'])

    def test_a_missing_folder_forgets_every_file(self):
        store = MemoryFile()
        library = self.library(store)
        read_all(library)
        library.save()

        library.scan(os.path.join(self.folder.path, 'missing'))

        self.assertEqual(library.replays(ACCOUNT), [])
        self.assertEqual(library.progress(), (0, 0))
        self.assertTrue(library.save())
        self.assertEqual(store.read()['files'], {})

    def test_a_renamed_replay_keeps_the_read_header(self):
        library = self.library()
        read_all(library)

        library.moved('own_new.mtreplay', 'best.mtreplay', os.path.join(self.folder.path, 'best.mtreplay'))

        self.assertEqual(names_of(library.replays(ACCOUNT)), ['best.mtreplay', 'own_old.wotreplay'])

    def test_a_forgotten_replay_leaves_the_list(self):
        library = self.library()
        read_all(library)

        library.forget('own_new.mtreplay')

        self.assertEqual(names_of(library.replays(ACCOUNT)), ['own_old.wotreplay'])

    def test_find_own_by_file_name(self):
        library = self.library()
        read_all(library)
        replays = library.replays(ACCOUNT)

        self.assertEqual(find_own(replays, 'own_old.wotreplay')['name'], 'own_old.wotreplay')
        self.assertIsNone(find_own(replays, 'other.mtreplay'))
        self.assertIsNone(find_own(replays, '../own_new.mtreplay'))

    def test_scan_keeps_the_newest_files(self):
        names = ['r%04d.mtreplay' % number for number in range(SCAN_MAX_FILES + 5)]
        library = ReplayLibrary(MemoryFile(), lambda path: None)

        library.scan(
            'x',
            listdir=lambda folder: names,
            stat=lambda path: FileInfo(int(os.path.basename(path)[1:5])),
        )

        self.assertEqual(library.progress(), (0, SCAN_MAX_FILES))
        self.assertNotIn('r0000.mtreplay', library.files)

    def test_a_new_replay_is_the_first_header_a_short_slice_reads(self):
        library = self.library()
        read_all(library)
        count = len(self.reads)
        self.folder.write('fresh.mtreplay', own_replay_bytes(777), 700)
        self.folder.write('own_old.wotreplay', replay_bytes(ACCOUNT, 555), 150)
        library.scan(self.folder.path)

        done = library.index(lambda: 0.0 if len(self.reads) == count else 10.0, AUTO_NAME_INDEX_S)

        self.assertEqual(done, 1)
        self.assertEqual(self.reads[count:], ['fresh.mtreplay'])
        self.assertEqual(names_of(library.replays(ACCOUNT)), ['fresh.mtreplay', 'own_new.mtreplay'])

    def test_a_stored_cache_of_another_layout_is_ignored(self):
        old_layout = {'v': 1, 'files': {'a.mtreplay': {'stamp': [1, 1], 'header': {}}}}

        self.assertEqual(ReplayLibrary(MemoryFile(old_layout)).entries, {})

    def test_a_stored_cache_that_is_not_an_object_is_ignored(self):
        self.assertEqual(ReplayLibrary(MemoryFile(['junk'])).entries, {})


def page_replay(name='a.mtreplay', header=None, size=2 * 1024 * 1024, mtime=1790000000.0):
    return {'name': name, 'path': name, 'size': size, 'mtime': mtime, 'header': header}


def own_header():
    folder = Folder()
    try:
        path = folder.write('x.mtreplay', own_replay_bytes(111), 100)
        return read_header(path)
    finally:
        folder.remove()


def t34(tank_id, vehicle):
    return {'label': u'Т-34', 'tier': 5, 'cls': 'mediumTank'}


def page_context(**values):
    index = UploadedIndex(MemoryFile())
    index.add('111', UPLOADED_ID)
    index.set_favourite('111', True)
    options = {
        'index': index,
        'client_version': CLIENT,
        'upload': 'ready',
        'describe_vehicle': t34,
        'image': lambda path: 'img://' + path,
    }
    options.update(values)
    return PageContext(**options)


class LibraryStub(object):

    @staticmethod
    def indexing():
        return False


class ItemTest(unittest.TestCase):

    def test_item_carries_the_file_and_the_map(self):
        item = item_of(page_replay(header=own_header()), page_context())

        self.assertEqual(item['id'], 'a.mtreplay')
        self.assertEqual(item['title'], 'a')
        self.assertEqual(item['map'], '05_prohorovka')
        self.assertEqual(item['map_title'], u'Прохоровка')

    def test_item_carries_the_described_vehicle(self):
        item = item_of(page_replay(header=own_header()), page_context())

        self.assertEqual(item['tank'], u'Т-34')
        self.assertEqual(item['tier'], 5)
        self.assertEqual(item['cls'], 'mediumTank')
        self.assertEqual(item['nation'], 'ussr')

    def test_item_carries_the_own_results(self):
        item = item_of(page_replay(header=own_header()), page_context())

        self.assertEqual(item['result'], 'win')
        self.assertEqual(item['damage'], 2150)
        self.assertEqual(item['assist'], 520)
        self.assertEqual(item['kills'], 2)
        self.assertEqual(item['xp'], 1150)
        self.assertTrue(item['survived'])

    def test_item_carries_the_battle_and_the_marks(self):
        item = item_of(page_replay(header=own_header()), page_context())

        self.assertEqual(item['type'], 'random')
        self.assertTrue(item['playable'])
        self.assertTrue(item['favourite'])
        self.assertEqual(item['site'], {'state': 'uploaded', 'link': '/replays/' + UPLOADED_ID})

    def test_item_carries_the_client_images(self):
        item = item_of(page_replay(header=own_header()), page_context())

        self.assertEqual(item['map_image'], 'img://gui/maps/icons/map/stats/05_prohorovka.png')
        self.assertEqual(item['map_thumb'], 'img://gui/maps/icons/map/small/05_prohorovka.png')
        self.assertEqual(item['tank_image'], 'img://gui/maps/icons/vehicle/ussr-R04_T-34.png')
        self.assertEqual(item['mastery_image'], 'img://gui/maps/icons/library/proficiency/class_icons_2_small.png')

    def test_item_without_results_has_no_results(self):
        header = dict(own_header(), result=None, damage=None, stats=None)

        item = item_of(page_replay(header=header), PageContext(client_version=CLIENT))

        self.assertIsNone(item['result'])
        self.assertIsNone(item['damage'])
        self.assertIsNone(item['kills'])
        self.assertIsNone(item['mastery'])
        self.assertIsNone(item['survived'])

    def test_item_without_client_lookups_falls_back_to_the_code_name(self):
        header = dict(own_header(), arena_unique_id=None)

        item = item_of(page_replay(header=header), PageContext(client_version=CLIENT))

        self.assertEqual(item['tank'], 'T-34')
        self.assertIsNone(item['tier'])
        self.assertIsNone(item['map_image'])
        self.assertIsNone(item['site'])
        self.assertFalse(item['favourite'])

    def test_a_replay_of_another_version_is_not_playable(self):
        header = dict(own_header(), client_version='1.44.1.0')

        item = item_of(page_replay(header=header), PageContext(client_version=CLIENT))

        self.assertIs(item['playable'], False)
        self.assertEqual(item['version'], '1.44.1.0')

    def test_an_analysed_replay(self):
        context = page_context(analysed={UPLOADED_ID})

        item = item_of(page_replay(header=own_header()), context)

        self.assertEqual(item['site']['state'], 'analysed')

    def test_a_queued_replay(self):
        context = page_context(queued={'222'})
        header = dict(own_header(), arena_unique_id='222')

        item = item_of(page_replay(header=header), context)

        self.assertEqual(item['site'], {'state': 'queued', 'link': None})


class NamesTest(unittest.TestCase):

    def test_battle_types(self):
        self.assertEqual(battle_type({'battle_type': 22}), 'ranked')
        self.assertEqual(battle_type({'battle_type': 43}), 'comp7')

    def test_unknown_battle_type_is_other(self):
        self.assertEqual(battle_type({'battle_type': 52}), 'other')
        self.assertEqual(battle_type({}), 'other')

    def test_vehicle_parts(self):
        self.assertEqual(vehicle_parts('germany-G04_PzVI_Tiger_I'), ('germany', 'G04_PzVI_Tiger_I'))

    def test_vehicle_parts_reject_other_text(self):
        self.assertEqual(vehicle_parts('../x'), (None, None))
        self.assertEqual(vehicle_parts(None), (None, None))

    def test_vehicle_label_drops_the_code_prefix(self):
        self.assertEqual(vehicle_label('germany-G04_PzVI_Tiger_I'), 'PzVI Tiger I')
        self.assertEqual(vehicle_label('usa-A175_OTAC_MT_58_02'), 'OTAC MT 58 02')


class PageTest(unittest.TestCase):

    def setUp(self):
        now = 1790507100.0
        header = dict(own_header(), date_time=now)
        early = dict(
            header,
            arena_unique_id='555',
            result=None,
            damage=None,
            stats=None,
            client_version='1.44.1.0',
            date_time=now - 57300,
            map_name='02_malinovka',
            map_title=u'Малиновка',
            vehicle='germany-G04_PzVI_Tiger_I',
            battle_type=22,
        )
        vehicles = {
            'ussr-R04_T-34': {'label': u'Т-34', 'tier': 5, 'cls': 'mediumTank'},
            'germany-G04_PzVI_Tiger_I': {'label': u'Tiger I', 'tier': 7, 'cls': 'heavyTank'},
        }
        self.replays = [
            page_replay('20260927_1405_ussr-R04_T-34_05_prohorovka.mtreplay', header, mtime=now),
            page_replay(
                '20260926_2210_germany-G04_PzVI_Tiger_I_02_malinovka.mtreplay',
                early,
                size=900000,
                mtime=now - 90000,
            ),
        ]
        self.context = page_context(
            queued={'555'},
            describe_vehicle=lambda tank_id, vehicle: vehicles[vehicle],
            viewer_battles=['555'],
        )

    def page(self, cache=None):
        status = page_status(ACCOUNT, LibraryStub)
        return build_page(self.replays, self.context, status, (2, 2), 'C:/Games/Tanki/replays', cache)

    def test_page_lists_the_replays_in_order(self):
        page = self.page()

        self.assertEqual(page['kind'], 'replays')
        self.assertEqual(page['status'], 'ready')
        self.assertEqual(page['progress'], {'done': 2, 'total': 2})
        self.assertEqual([item['id'] for item in page['items']], names_of(self.replays))

    def test_page_lists_the_battles_the_hit_viewer_can_open(self):
        self.assertEqual(self.page()['hit_viewer'], ['555'])

    def test_page_without_an_account(self):
        self.assertEqual(page_status(None, LibraryStub), 'no_account')

    def test_page_matches_the_ui_fixture(self):
        page = self.page()

        if os.environ.get('OTMETKI_UPDATE_FIXTURES') == '1':
            write_page_fixture(page)

        self.assertEqual(_support.load_json(PAGE_FIXTURE), json.loads(json.dumps(page)))

    def test_cached_page_is_the_same_page(self):
        self.assertEqual(self.page(ItemCache()), self.page())


def write_page_fixture(page):
    text = json.dumps(page, sort_keys=True, indent=2, ensure_ascii=False) + '\n'
    directory = os.path.dirname(PAGE_FIXTURE)
    if not os.path.isdir(directory):
        os.makedirs(directory)
    with io.open(PAGE_FIXTURE, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text if isinstance(text, type(u'')) else text.decode('utf-8'))


class ItemCacheTest(unittest.TestCase):

    def setUp(self):
        self.header = own_header()
        self.described = []
        self.context = page_context(describe_vehicle=self.describe)
        second = page_replay('b.mtreplay', dict(self.header, arena_unique_id='222'), mtime=1790000100.0)
        self.replays = [page_replay('a.mtreplay', self.header), second]
        self.cache = ItemCache()

    def describe(self, tank_id, vehicle):
        self.described.append(vehicle)
        return {}

    def test_unchanged_items_are_not_built_again(self):
        first = self.cache.items_of(self.replays, self.context)

        again = self.cache.items_of(self.replays, self.context)

        self.assertIs(again[0], first[0])
        self.assertIs(again[1], first[1])
        self.assertEqual(len(self.described), 2)

    def test_a_new_favourite_rebuilds_its_item(self):
        first = self.cache.items_of(self.replays, self.context)
        self.context.index.set_favourite('222', True)

        again = self.cache.items_of(self.replays, self.context)

        self.assertIsNot(again[1], first[1])
        self.assertIs(again[1]['favourite'], True)

    def test_a_renamed_file_is_a_new_item(self):
        first = self.cache.items_of(self.replays, self.context)
        renamed = [page_replay('c.mtreplay', self.header), self.replays[1]]

        again = self.cache.items_of(renamed, self.context)

        self.assertEqual(again[0], dict(first[0], id='c.mtreplay', title='c'))
        self.assertEqual(len(self.described), 3)

    def test_a_header_read_again_rebuilds_only_its_item(self):
        first = self.cache.items_of(self.replays, self.context)
        reread = [dict(self.replays[0], header=dict(self.header, damage=10)), self.replays[1]]

        again = self.cache.items_of(reread, self.context)

        self.assertEqual(again[0]['damage'], 10)
        self.assertIs(again[1], first[1])

    def test_the_cache_keeps_only_the_listed_files(self):
        self.cache.items_of(self.replays, self.context)
        renamed = [page_replay('c.mtreplay', self.header), self.replays[1]]

        self.cache.items_of(renamed, self.context)

        self.assertEqual(sorted(self.cache.items), ['b.mtreplay', 'c.mtreplay'])


def playable_replay(version=CLIENT):
    return {'name': 'a.mtreplay', 'path': 'a.mtreplay', 'header': {'client_version': version}}


def always(path):
    return True


def never(path):
    return False


class VersionTest(unittest.TestCase):

    def test_version_key_reads_four_numbers(self):
        self.assertEqual(version_key('1.45.0.0'), (1, 45, 0, 0))
        self.assertEqual(version_key(u'«Мир танков» v.1.45.0.0 #2284'), (1, 45, 0, 0))

    def test_version_key_needs_four_numbers(self):
        self.assertIsNone(version_key('1.45'))
        self.assertIsNone(version_key(None))

    def test_only_the_exact_version_is_compatible(self):
        self.assertTrue(compatible('1.45.0.0', '1.45.0.0'))
        self.assertFalse(compatible('1.45.0.1', '1.45.0.0'))
        self.assertFalse(compatible('1.44.1.0', '1.45.0.0'))

    def test_an_unknown_version_is_not_compatible(self):
        self.assertFalse(compatible(None, '1.45.0.0'))
        self.assertFalse(compatible('1.45.0.0', None))


class PlayTest(unittest.TestCase):

    def test_a_replay_of_this_client_plays(self):
        self.assertIsNone(play_refusal(playable_replay(), CLIENT, False, False, True))

    def test_guards_in_order(self):
        self.assertEqual(play_refusal(playable_replay(), CLIENT, True, True, False), 'unavailable')
        self.assertEqual(play_refusal(playable_replay(), CLIENT, True, True, True), 'battle')
        self.assertEqual(play_refusal(None, CLIENT, False, True, True), 'playing')
        self.assertEqual(play_refusal(None, CLIENT, False, False, True), 'missing')

    def test_another_version_is_refused(self):
        self.assertEqual(play_refusal(playable_replay('1.44.1.0'), CLIENT, False, False, True), 'version')

    def test_an_unknown_client_version_is_refused(self):
        self.assertEqual(play_refusal(playable_replay(), None, False, False, True), 'version')


class LaunchTest(unittest.TestCase):

    def setUp(self):
        self.request = launch_request(u'C:/Игры/replays/a.mtreplay', 1000.0)

    def test_a_fresh_request_plays(self):
        self.assertEqual(pending_launch(self.request, 1010.0, always), u'C:/Игры/replays/a.mtreplay')

    def test_an_old_request_is_dropped(self):
        self.assertIsNone(pending_launch(self.request, 1000.0 + LAUNCH_TTL_S + 1, always))

    def test_a_request_from_the_future_is_dropped(self):
        self.assertIsNone(pending_launch(self.request, 990.0, always))

    def test_a_request_for_a_missing_file_is_dropped(self):
        self.assertIsNone(pending_launch(self.request, 1010.0, never))

    def test_a_request_for_a_file_that_is_no_replay_is_dropped(self):
        for path in ('C:/replays/temp.mtreplay', 'C:/replays/notes.txt'):
            self.assertIsNone(pending_launch(launch_request(path, 1000.0), 1010.0, always))

    def test_a_broken_request_is_dropped(self):
        for junk in (None, [], {'path': 5, 'at': 1000.0}, {'path': 'a.mtreplay'}):
            self.assertIsNone(pending_launch(junk, 1010.0, always))

    def test_a_stop_while_the_client_closes_is_a_teardown(self):
        self.assertTrue(stop_on_teardown((), {'isDestroyed': True}))
        self.assertTrue(stop_on_teardown((None, False, True), {}))

    def test_other_stops_are_not_a_teardown(self):
        self.assertFalse(stop_on_teardown((), {}))
        self.assertFalse(stop_on_teardown((12.5,), {}))
        self.assertFalse(stop_on_teardown((None, True), {}))
        self.assertFalse(stop_on_teardown((None, False, True), {'isDestroyed': False}))


class RenameTest(unittest.TestCase):

    def test_spaces_are_squeezed_and_the_extension_kept(self):
        self.assertEqual(rename_target('a.mtreplay', u'  Мой  лучший бой '), u'Мой лучший бой.mtreplay')

    def test_path_characters_become_spaces(self):
        self.assertEqual(rename_target('a.mtreplay', 'x/../..\\y:z'), 'x .. .. y z.mtreplay')

    def test_a_typed_extension_is_not_doubled(self):
        self.assertEqual(rename_target('a.wotreplay', 'best.wotreplay'), 'best.wotreplay')

    def test_a_long_name_is_cut(self):
        self.assertEqual(rename_target('a.mtreplay', 'b' * 300), 'b' * 100 + '.mtreplay')

    def test_bad_names(self):
        for title in ('', '   ', '...', 'CON', 'lpt1', None, 42):
            with self.assertRaises(ReplayActionError):
                rename_target('a.mtreplay', title)


class UploadedIndexTest(unittest.TestCase):

    def test_an_upload_needs_an_arena_and_an_id(self):
        index = UploadedIndex(MemoryFile())

        self.assertFalse(index.add('1', None))
        self.assertFalse(index.add(None, 'x'))

    def test_uploads_persist_and_are_bounded(self):
        store = MemoryFile()
        index = UploadedIndex(store)
        for arena in range(INDEX_MAX + 5):
            index.add(str(arena), 'id-%d' % arena)

        again = UploadedIndex(store)

        self.assertIsNone(again.get('0'))
        self.assertEqual(again.get(str(INDEX_MAX + 4)), 'id-%d' % (INDEX_MAX + 4))
        self.assertEqual(len(again.items), INDEX_MAX)

    def test_a_stored_upload_is_read(self):
        index = UploadedIndex(MemoryFile({'uploaded': [['1', 'a']]}))

        self.assertEqual(index.get('1'), 'a')
        self.assertFalse(index.is_favourite('1'))

    def test_a_favourite_is_set_once(self):
        index = UploadedIndex(MemoryFile())

        self.assertTrue(index.set_favourite('1', True))
        self.assertFalse(index.set_favourite('1', True))
        self.assertFalse(index.set_favourite('', True))

    def test_a_favourite_follows_its_file(self):
        store = MemoryFile({'uploaded': [['1', 'a']]})
        index = UploadedIndex(store)
        index.set_favourite('1', True)

        index.moved('1', '2')

        self.assertEqual(UploadedIndex(store).favourites, ['2'])
        self.assertEqual(UploadedIndex(store).get('1'), 'a')

    def test_a_favourite_is_cleared(self):
        store = MemoryFile()
        index = UploadedIndex(store)
        index.set_favourite('2', True)

        is_changed = index.set_favourite('2', False)

        self.assertTrue(is_changed)
        self.assertFalse(UploadedIndex(store).is_favourite('2'))

    def test_favourites_are_bounded(self):
        store = MemoryFile()
        index = UploadedIndex(store)

        for number in range(FAVOURITES_MAX + 3):
            index.set_favourite(str(number), True)

        self.assertEqual(len(UploadedIndex(store).favourites), FAVOURITES_MAX)

    def test_broken_stored_marks_are_skipped(self):
        index = UploadedIndex(MemoryFile({'uploaded': [['1'], 5], 'favourites': [5, '', 'x']}))

        self.assertEqual(index.items, [])
        self.assertEqual(index.favourites, ['x'])


class SettingsTest(unittest.TestCase):

    def test_the_switch(self):
        self.assertEqual(SETTINGS, ('hangar_replay_manager',))

    def test_the_settings(self):
        self.assertEqual(set(SCHEMA.defaults), {'notify_analysis', 'auto_rename', 'name_template'})

    def test_auto_rename_is_off_by_default(self):
        self.assertIs(SCHEMA.defaults['auto_rename'], False)

    def test_the_name_template_is_cut(self):
        self.assertEqual(len(SCHEMA.coerce('name_template', 'x' * 500)), 100)

    def test_every_setting_has_a_label_in_both_languages(self):
        for language in ('ru', 'en'):
            for key in SCHEMA.defaults:
                self.assertIn('replay_manager_%s' % key, STRINGS[language])

    def test_both_languages_have_the_same_strings(self):
        self.assertEqual(set(STRINGS['ru']), set(STRINGS['en']))


def own_event(arena='777'):
    return {
        'arena_unique_id': arena,
        'arena_created_at': int(STARTED),
        'occurred_at': int(STARTED) + 400,
        'result': 'win',
        'map_name': '05_prohorovka',
        'vehicle': {'tank_id': 1, 'tier': 5},
        'stats': {'damage_dealt': 2150, 'xp': 1150, 'frags': 2},
    }


def folder_replay(name, arena=None, started=None, mtime=STARTED + 400):
    header = {'arena_unique_id': arena, 'date_time': started}
    return {'name': name, 'path': name, 'size': 1, 'mtime': mtime, 'header': header}


def event_values():
    return name_values(own_event(), u'Прохоровка', u'Т-34', u'победа')


def planned(renames):
    return [(replay['name'], name) for replay, name in renames]


class AutoNameTest(unittest.TestCase):

    def test_values_of_the_battle(self):
        values = event_values()

        self.assertEqual(values['date'], '2026-09-27')
        self.assertEqual(values['time'], '14-05')
        self.assertEqual(values['damage'], 2150)

    def test_the_template_renders_the_name(self):
        name = render_name('{date}_{time}_{map}_{vehicle}_{result}_{damage}', event_values(), 'old.mtreplay')

        self.assertEqual(name, u'2026-09-27_14-05_Прохоровка_Т-34_победа_2150.mtreplay')

    def test_forbidden_characters_leave_the_name(self):
        self.assertEqual(render_name('{vehicle}: <bad>?', event_values(), 'a.wotreplay'), u'Т-34 bad.wotreplay')

    def test_an_empty_name_is_no_name(self):
        self.assertIsNone(render_name('   ', event_values(), 'a.mtreplay'))

    def test_a_battle_is_queued_once(self):
        namer = AutoNamer()

        self.assertTrue(namer.queue(own_event('777'), event_values(), 0.0))
        self.assertFalse(namer.queue(own_event('777'), event_values(), 0.0))

    def test_a_replay_is_matched_by_its_arena(self):
        namer = AutoNamer()
        namer.queue(own_event('777'), event_values(), 0.0)
        replays = [folder_replay('other.mtreplay', arena='555'), folder_replay('mine.mtreplay', arena='777')]

        renames = namer.plan(replays, '{result}', STARTED + 500)

        self.assertEqual(planned(renames), [('mine.mtreplay', u'победа.mtreplay')])
        self.assertEqual(namer.pending, [])

    def test_a_replay_without_an_arena_is_matched_by_its_start(self):
        namer = AutoNamer()
        namer.queue(own_event('778'), event_values(), 0.0)
        by_time = [folder_replay('left_early.mtreplay', started=STARTED + 60)]

        renames = namer.plan(by_time, '{map}', STARTED + 500)

        self.assertEqual(planned(renames), [('left_early.mtreplay', u'Прохоровка.mtreplay')])

    def test_waits_for_the_file_to_settle(self):
        namer = AutoNamer()
        namer.queue(own_event(), event_values(), STARTED)
        fresh = [folder_replay('mine.mtreplay', arena='777', mtime=STARTED + 495)]

        renames = namer.plan(fresh, '{result}', STARTED + 500)

        self.assertEqual(renames, [])
        self.assertEqual(len(namer.pending), 1)

    def test_gives_up_on_a_battle_without_a_replay(self):
        namer = AutoNamer()
        namer.queue(own_event(), event_values(), STARTED)

        renames = namer.plan([], '{result}', STARTED + 3 * 3600)

        self.assertEqual(renames, [])
        self.assertEqual(namer.pending, [])


def analysis_example():
    return _support.load_json(os.path.join(_support.CONTRACT_DIR, 'examples', 'replay-analysis.example.json'))


class AnalysisTest(unittest.TestCase):

    def test_the_example_matches_the_contract(self):
        validator = _support.schema_validator('replay-analysis.schema.json', 'statuses')
        if validator is None:
            self.skipTest('jsonschema not installed')

        validator.validate(analysis_example())

    def test_statuses_carry_the_highlights(self):
        statuses = parse_statuses(analysis_example(), EXAMPLE_ACCOUNT)

        self.assertEqual(statuses[PARSED_ID], ('parsed', {'accuracy': 83.3, 'damage': 2150, 'penetrations': 7}))
        self.assertEqual(statuses[PARSING_ID][0], 'parsing')

    def test_another_accounts_statuses_are_ignored(self):
        self.assertEqual(parse_statuses(analysis_example(), 1), {})

    def test_broken_rows_are_skipped(self):
        self.assertEqual(parse_statuses({'account_id': 1, 'replays': [{'id': 5}]}, 1), {})


class AnalysisWatchTest(unittest.TestCase):

    def setUp(self):
        self.watch = AnalysisWatch()
        self.watch.add(PARSED_ID, 100.0)
        self.watch.add(PARSING_ID, 110.0)

    def test_due_replays_oldest_first(self):
        self.watch.add(None, 110.0)

        self.assertEqual(self.watch.due(200.0), [PARSED_ID, PARSING_ID])

    def test_a_finished_analysis_is_reported(self):
        finished = self.watch.apply(parse_statuses(analysis_example(), EXAMPLE_ACCOUNT))

        self.assertEqual([replay_id for replay_id, _ in finished], [PARSED_ID])

    def test_a_finished_analysis_is_reported_once(self):
        self.watch.apply(parse_statuses(analysis_example(), EXAMPLE_ACCOUNT))

        again = self.watch.apply(parse_statuses(analysis_example(), EXAMPLE_ACCOUNT))

        self.assertEqual(again, [])

    def test_the_watch_gives_up_after_a_while(self):
        self.watch.apply(parse_statuses(analysis_example(), EXAMPLE_ACCOUNT))

        self.assertEqual(self.watch.due(110.0 + ANALYSIS_WATCH_S + 1), [])

    def test_a_parsed_replay_is_not_watched_again(self):
        self.watch.apply(parse_statuses(analysis_example(), EXAMPLE_ACCOUNT))
        self.watch.due(110.0 + ANALYSIS_WATCH_S + 1)

        self.watch.add(PARSED_ID, 300.0)

        self.assertEqual(self.watch.due(300.0), [])

    def test_one_read_asks_for_a_bounded_number_of_replays(self):
        watch = AnalysisWatch()
        for number in range(ANALYSIS_IDS_PER_READ + 5):
            watch.add('id-%02d' % number, 400.0 + number)

        due = watch.due(500.0)

        self.assertEqual(len(due), ANALYSIS_IDS_PER_READ)
        self.assertEqual(due[0], 'id-00')

    def test_notice_lists_the_highlights(self):
        translate = _support.translator(STRINGS, 'ru')

        notice = analysis_notice({'accuracy': 83.3, 'damage': 2150, 'penetrations': 7}, translate)

        self.assertEqual(notice, u'Три отметки: разбор реплея готов на сайте (точность 83%, урон 2 150, пробитий 7)')

    def test_notice_without_highlights(self):
        translate = _support.translator(STRINGS, 'ru')

        notice = analysis_notice({'accuracy': None, 'damage': None, 'penetrations': None}, translate)

        self.assertEqual(notice, u'Три отметки: разбор реплея готов на сайте')


if __name__ == '__main__':
    unittest.main()
