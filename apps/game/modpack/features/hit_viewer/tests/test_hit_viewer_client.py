# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import json
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from _support import MemoryFile
from otmetki.core.storage import flush_pending
from otmetki.features.hit_viewer.model import HitBook

STUBBED = ('BigWorld', 'Vehicle', 'BattleFeedbackCommon', 'items', 'items.vehicles', 'Math')
CLIENT_PREFIXES = ('otmetki.core.client', 'otmetki.features.hit_viewer.client')
OWN_ID = 3
ENEMY_ID = 7
ALLY_ID = 9
HULL_PEN = 4 | (1 << 8) | (120 << 16) | (100 << 24) | (250 << 32) | (130 << 40) | (110 << 48) | (255 << 56)
HULL_BOXES = {1: ((0.0, 0.0, 0.0), (1.0, 1.0, 2.0))}
ANALYSIS = {'angle': 30.0, 'armor': 115, 'nominal': 100}
EFFECTS_INDEX = 12
AIM = (0.5, -0.1)
DAMAGE, RECEIVED_DAMAGE = 7, 10


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


class Shot(object):

    def __init__(self, effects_index, kind, caliber):
        self.shell = Namespace(effectsIndex=effects_index, kind=kind, caliber=caliber)


def gun_descriptor(*shots):
    return Namespace(gun=Namespace(shots=list(shots)))


class Avatar(object):

    playerVehicleID = OWN_ID
    arenaUniqueID = 555
    arena = Namespace(vehicles={
        ENEMY_ID: {'vehicleType': gun_descriptor(Shot(EFFECTS_INDEX, 'ARMOR_PIERCING_CR', 128.0))},
        OWN_ID: {'vehicleType': gun_descriptor(Shot(EFFECTS_INDEX, 'HOLLOW_CHARGE', 100.0))},
    })


class Part(object):

    def __init__(self, compact_descr):
        self.compactDescr = compact_descr


class Descriptor(object):

    def __init__(self, type_cd):
        self.type = Part(type_cd)
        self.chassis, self.turret, self.gun = Part(type_cd + 1), Part(type_cd + 2), Part(type_cd + 3)


class Vehicle(object):

    def __init__(self, entity_id, own=False):
        self.id = entity_id
        self.isPlayerVehicle = own
        self.typeDescriptor = Descriptor(entity_id * 100)

    def getAimParams(self):
        return AIM

    def showDamageFromShot(self, attacker_id, points, effects_index, damage_factor, last_material_is_shield):
        return None


class Extra(object):

    def __init__(self, damage):
        self.damage = damage

    def isShot(self):
        return True

    def getDamage(self):
        return self.damage


class FeedbackEvent(object):

    def __init__(self, kind, target_id, damage):
        self.kind, self.target_id, self.extra = kind, target_id, Extra(damage)

    def getBattleEventType(self):
        return self.kind

    def getTargetID(self):
        return self.target_id

    def getExtra(self):
        return self.extra


class Vector2(list):

    def __init__(self, x, y):
        list.__init__(self, (x, y))


class CameraManager(object):

    def __init__(self):
        self.limits = None

    def moveCamera(self, point, yaw, pitch, distance, duration, limits):
        limits[0] = min(limits[0], limits[1])
        self.limits = limits


class Component(object):

    def __init__(self):
        self.app = Namespace(bus=EventBus(), account_id=None)
        self.settings = {'keep_battles': 20, 'record_received': True, 'record_dealt': True}
        self.store = MemoryFile()

    def enabled(self):
        return True

    def follow_account(self, on_account):
        on_account(1)

    def account_file(self, pattern, account_id):
        return self.store


def stub_client():
    big_world = types.ModuleType(str('BigWorld'))
    big_world.player = Avatar
    big_world.callback = lambda delay, callback: None
    vehicle_module = types.ModuleType(str('Vehicle'))
    vehicle_module.Vehicle = Vehicle
    feedback_common = types.ModuleType(str('BattleFeedbackCommon'))
    feedback_common.BATTLE_EVENT_TYPE = type(str('BATTLE_EVENT_TYPE'), (object,), {
        'DAMAGE': DAMAGE, 'RECEIVED_DAMAGE': RECEIVED_DAMAGE,
    })
    items = types.ModuleType(str('items'))
    vehicles = types.ModuleType(str('items.vehicles'))
    vehicles.g_cache = Namespace(shotEffects={})
    items.vehicles = vehicles
    math = types.ModuleType(str('Math'))
    math.Vector2 = Vector2
    for name, module in zip(STUBBED, (big_world, vehicle_module, feedback_common, items, vehicles, math)):
        sys.modules[name] = module


def forget_client():
    _support.forget_modules(CLIENT_PREFIXES)


class RecorderTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        forget_client()
        stub_client()
        recorder_module = importlib.import_module('otmetki.features.hit_viewer.client.recorder')
        self.component = Component()
        self.recorder = recorder_module.HitRecorder(self.component)
        self.recorder.hooks.add = lambda *args: None
        self.recorder._on_battle_ready(Avatar())

    def tearDown(self):
        flush_pending()
        forget_client()
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def finish(self):
        self.component.app.bus.emit('battle_leave')
        return self.recorder.battles()[-1]

    def test_a_hit_on_the_own_tank_is_recorded_as_received(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], 0, 1.0, False)

        assert self.finish()['hits'][0]['side'] == 'received'

    def test_an_own_hit_on_an_enemy_is_recorded_as_dealt(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)

        assert self.finish()['hits'][0]['side'] == 'dealt'

    def test_a_shot_between_two_other_vehicles_is_not_recorded(self):
        Vehicle(ENEMY_ID).showDamageFromShot(ALLY_ID, [HULL_PEN], 0, 1.0, False)
        self.component.app.bus.emit('battle_leave')

        assert self.recorder.battles() == []

    def test_the_shell_of_a_received_hit_comes_from_the_attackers_gun(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], EFFECTS_INDEX, 1.0, False)

        assert self.finish()['hits'][0]['shell'] == 'apcr'

    def test_the_calibre_comes_from_the_attackers_shell(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], EFFECTS_INDEX, 1.0, False)

        assert self.finish()['hits'][0]['caliber'] == 128

    def test_the_shell_of_a_dealt_hit_comes_from_the_own_gun(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], EFFECTS_INDEX, 1.0, False)

        assert self.finish()['hits'][0]['shell'] == 'heat'

    def test_an_unknown_effects_index_leaves_the_shell_unknown(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], 99, 1.0, False)

        assert self.finish()['hits'][0]['shell'] is None

    def test_the_hit_keeps_the_hit_vehicles_turret_and_gun_pose(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], EFFECTS_INDEX, 1.0, False)

        assert self.finish()['hits'][0]['aim'] == [0.5, -0.1]

    def test_the_target_keeps_only_the_model_modules(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)

        assert sorted(self.finish()['targets'][u'7']) == ['cd', 'chassis', 'class', 'gun', 'name', 'turret']

    def test_the_own_feedback_damage_reaches_the_dealt_hit(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)

        self.recorder._on_feedback([FeedbackEvent(DAMAGE, ENEMY_ID, 420)])

        assert self.finish()['hits'][0]['damage'] == 420

    def test_the_end_of_a_battle_leaves_the_book_off_the_disk(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], 0, 1.0, False)

        self.finish()

        assert self.component.store.data is None

    def test_the_hangar_writes_the_book(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], 0, 1.0, False)
        self.finish()

        flush_pending()

        assert len(self.component.store.data['battles']) == 1

    def test_the_timed_flush_of_a_battle_leaves_the_book_held(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], 0, 1.0, False)
        self.finish()

        flush_pending(held=False)

        assert self.component.store.data is None

    def test_clearing_the_book_in_the_hangar_writes_it_at_once(self):
        Vehicle(OWN_ID, own=True).showDamageFromShot(ENEMY_ID, [HULL_PEN], 0, 1.0, False)
        self.finish()

        self.recorder.clear()

        assert self.component.store.data['battles'] == []

    def test_the_same_account_announced_again_keeps_the_battle_being_recorded(self):
        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)

        self.recorder._on_account(1)

        assert len(self.finish()['hits']) == 1

    def test_a_battle_ready_again_listens_to_the_feedback_once(self):
        added = []
        self.recorder.hooks.add = lambda *args: added.append(args)
        cleared = []
        self.recorder.hooks.clear = lambda: cleared.append(len(added))

        self.recorder._on_battle_ready(Avatar())
        self.recorder._on_battle_ready(Avatar())

        assert cleared == [0, 1]

    def test_a_switched_off_side_is_not_recorded(self):
        self.component.settings['record_dealt'] = False

        Vehicle(ENEMY_ID).showDamageFromShot(OWN_ID, [HULL_PEN], 0, 1.0, False)
        self.component.app.bus.emit('battle_leave')

        assert self.recorder.battles() == []


def recorded_battle(battle_id, hits):
    hit = {'target': 'own', 'side': 'received', 'outcome': 'pen', 'part': 'hull', 'segments': [HULL_PEN]}
    return {'id': battle_id, 'hits': [dict(hit) for _ in range(hits)], 'targets': {'own': {'cd': 1}}}


class ScreenTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        forget_client()
        stub_client()
        screen_module = importlib.import_module('otmetki.features.hit_viewer.client.screen')
        self.screen_module = screen_module
        self.callbacks = []
        screen_module.BigWorld.callback = lambda delay, callback: self.callbacks.append(callback)
        self.lines = []
        screen_module.log = self.lines.append
        component = Component()
        component.app.in_battle = False
        component.app.translate = lambda key, **values: key
        self.screen = screen_module.HitViewerScreen(component, Namespace(book=None))
        self.ended = []
        self.screen.stage.end = lambda: self.ended.append(True)
        self.hangar_shown = []
        window_module = importlib.import_module('otmetki.features.hit_viewer.client.window')
        window_module.show_hangar = lambda: self.hangar_shown.append(True)

    def tearDown(self):
        forget_client()
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def run_callbacks(self):
        while self.callbacks:
            self.callbacks.pop(0)()

    def opened_view(self):
        view = Namespace(viewModel=Namespace(set_state=lambda text: None))
        self.screen.window.is_open = True
        self.screen.window.on_loaded(view)
        return view

    def openable_window(self):
        self.pushed = []
        self.screen.window.available = lambda: True
        self.screen.window.open = lambda: setattr(self.screen.window, 'is_open', True) or True
        self.screen.window.push_state = self.pushed.append
        self.screen.stage.begin = lambda: True

    def test_a_window_the_client_destroyed_gives_the_hangar_back(self):
        view = self.opened_view()

        self.screen.window.on_destroyed(view)

        assert (self.screen.is_open, self.ended) == (False, [True])

    def test_the_viewer_opens_before_the_first_recorded_battle(self):
        self.openable_window()

        self.screen.open()

        assert self.screen.is_open is True

    def test_the_viewer_without_battles_shows_the_empty_state(self):
        self.openable_window()

        self.screen.open()

        assert json.loads(self.pushed[-1])['battle'] is None

    def test_an_opening_refused_in_a_battle_is_logged(self):
        self.screen.component.app.in_battle = True

        self.screen.open()

        assert self.lines == ['hit viewer: not opened: hv_refused_battle']

    def screen_on_two_battles(self):
        book = HitBook(None, 20)
        book.battles = [recorded_battle('a', 3), recorded_battle('b', 1)]
        self.screen.recorder.book = book
        self.shown = []
        self.screen.stage.show = self.shown.append
        self.screen.push = lambda: None
        self.screen._select_battle(book.battle('a'))
        self.screen.loaded, self.screen.wanted, self.screen.decoded = 'own', 'own', {2: 'decoded'}
        return book

    def test_another_battle_drops_the_models_and_hits_of_the_first(self):
        book = self.screen_on_two_battles()

        self.screen._select_battle(book.battle('b'))

        assert (self.screen.decoded, self.screen.loaded, len(self.shown)) == ({}, None, 2)

    def test_a_selected_battle_the_book_dropped_moves_to_the_latest_with_its_own_hits(self):
        book = self.screen_on_two_battles()
        book.resize(1)
        self.opened_view()

        self.screen.battles_changed()

        assert (self.screen.selection['battle'], self.screen.decoded) == ('b', {})

    def test_closing_the_viewer_gives_the_hangar_back_once(self):
        view = self.opened_view()

        self.screen.close()
        self.screen.window.on_destroyed(view)

        assert (self.screen.is_open, self.ended) == (False, [True])

    def test_closing_the_viewer_brings_the_stock_hangar_view_back(self):
        self.opened_view()

        self.screen.close()

        assert self.hangar_shown == [True]

    def test_closing_for_a_battle_queue_leaves_the_queue_view_on_screen(self):
        self.opened_view()

        self.screen.close(restore_hangar=False)

        assert self.hangar_shown == []

    def test_a_vehicle_whose_hits_never_get_placed_is_logged_once_after_the_retries(self):
        self.screen_on_two_battles()

        self.screen._on_model_loaded()
        self.run_callbacks()

        assert [line for line in self.lines if 'placed' in line] == [
            'hit viewer: vehicle own: 0 of 3 hits placed, 0 measured, collision missing']

    def collision_after(self, attempts):
        answers = [None] * attempts + [HULL_BOXES]
        self.screen.stage.boxes = lambda: answers.pop(0) if len(answers) > 1 else answers[0]
        self.screen.stage.measure = lambda geometry, shell=None, caliber=None: dict(ANALYSIS)
        self.screen.stage.pose = lambda aim: None
        self.screen.stage.focus = lambda geometry, hit, duration: self.flown.append(geometry.part)
        self.flown = []

    def test_hits_are_placed_once_the_hangar_collision_arrives(self):
        self.screen_on_two_battles()
        self.collision_after(3)

        self.screen._on_model_loaded()
        self.run_callbacks()

        assert sorted(self.screen.decoded) == [0, 1, 2]

    def test_the_camera_flies_to_the_selected_hit_once_it_is_placed(self):
        self.screen_on_two_battles()
        self.collision_after(2)

        self.screen._on_model_loaded()
        self.run_callbacks()

        assert self.flown == ['hull']

    def test_a_placed_hit_keeps_its_measured_angle_and_armour(self):
        book = self.screen_on_two_battles()
        self.collision_after(0)

        self.screen._on_model_loaded()
        self.run_callbacks()

        assert book.battle('a')['hits'][0]['armor'] == 115

    def test_the_old_view_going_away_after_a_reopen_does_not_close_the_new_opening(self):
        old = self.opened_view()
        self.screen.window.close()
        self.screen.window.is_open = True

        self.screen.window.on_destroyed(old)

        assert self.screen.window.is_open is True

    def test_a_view_the_client_replaced_does_not_load_the_hangar_view_again(self):
        view = self.opened_view()

        self.screen.window.on_destroyed(view)

        assert self.hangar_shown == []


class Event(object):

    def __init__(self):
        self.delegates = []

    def __iadd__(self, delegate):
        self.delegates.append(delegate)
        return self

    def __isub__(self, delegate):
        self.delegates.remove(delegate)
        return self


class StageTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        forget_client()
        stub_client()
        stage_module = importlib.import_module('otmetki.features.hit_viewer.client.stage')
        self.stage_module = stage_module
        self.space = Namespace(onVehicleChanged=Event())
        stage_module.hangar_space = lambda: self.space
        stage_module.camera_place = lambda: None
        self.callbacks = []
        stage_module.BigWorld.callback = lambda delay, callback: self.callbacks.append(callback)
        self.stage = stage_module.HangarStage(lambda: None)
        self.stage.preview = lambda: Namespace(selectNoVehicle=lambda: None)

    def tearDown(self):
        forget_client()
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_ending_the_stage_unsubscribes_from_the_hangar(self):
        self.stage.begin()

        self.stage.end()

        assert self.space.onVehicleChanged.delegates == []

    def test_reopening_before_the_camera_came_back_is_not_left_restoring(self):
        self.stage.begin()
        self.stage.shown = True
        self.stage.end()

        self.stage.begin()

        assert self.stage.restoring is False

    def reopened_and_closed(self):
        for _ in range(2):
            self.stage.begin()
            self.stage.shown = True
            self.stage.end()

    def test_a_late_restore_of_the_previous_opening_does_not_end_the_new_one(self):
        self.reopened_and_closed()

        self.callbacks[0]()

        assert self.stage.subscribed is not None

    def focused_camera(self):
        manager = CameraManager()
        self.stage_module.camera_manager = lambda space: manager
        self.space.spaceID = 1
        self.stage.space = self.space
        self.stage.scene.show = lambda *args: None
        self.stage.world = lambda geometry: ((0.0, 1.0, 2.0), Namespace(yaw=0.5, pitch=0.1))
        self.stage.focus(Namespace(part='hull'), {'outcome': 'pen'}, 0.5)
        return manager

    def test_the_camera_gets_limits_it_can_change_like_the_orbit_ones(self):
        manager = self.focused_camera()

        assert (type(manager.limits), list(manager.limits)) == (Vector2, [2.9, 9.0])

    def test_reopening_keeps_one_hangar_subscription(self):
        self.reopened_and_closed()

        self.callbacks[1]()

        assert self.space.onVehicleChanged.delegates == []


if __name__ == '__main__':
    unittest.main()
