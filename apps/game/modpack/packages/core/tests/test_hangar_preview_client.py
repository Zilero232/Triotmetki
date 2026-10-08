# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import sys
import types
import unittest

import _support

STUBBED = ('BigWorld',)
CLIENT_PREFIXES = ('otmetki.core.client.hangar_preview',)


class Namespace(object):

    def __init__(self, **values):
        self.__dict__.update(values)


class Event(object):

    def __init__(self):
        self.delegates = []

    def __iadd__(self, delegate):
        self.delegates.append(delegate)
        return self

    def __isub__(self, delegate):
        self.delegates.remove(delegate)
        return self

    def fire(self):
        for delegate in list(self.delegates):
            delegate()


class Preview(object):

    def __init__(self):
        self.selected = []

    def selectVehicle(self, tank_id, compact_descr):
        self.selected.append((tank_id, compact_descr))

    def selectNoVehicle(self):
        self.selected.append(None)


class CameraManager(object):

    def __init__(self):
        self.resets = []

    def resetCameraTarget(self, duration):
        self.resets.append(duration)


class HangarPreviewTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        _support.forget_modules(CLIENT_PREFIXES)
        self.callbacks = []
        big_world = types.ModuleType(str('BigWorld'))
        big_world.callback = lambda delay, callback: self.callbacks.append(callback)
        sys.modules['BigWorld'] = big_world
        module = importlib.import_module('otmetki.core.client.hangar_preview')
        self.space = Namespace(onVehicleChanged=Event(), spaceID=1)
        self.manager = CameraManager()
        module.hangar_space = lambda: self.space
        module.camera_manager = lambda space: self.manager
        self.loaded = []
        self.preview = module.HangarPreview('test', lambda: self.loaded.append(True))
        self.client_preview = Preview()
        self.preview.preview = lambda: self.client_preview

    def tearDown(self):
        _support.forget_modules(CLIENT_PREFIXES)
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def reopened_and_closed(self):
        for _ in range(2):
            self.preview.begin()
            self.preview.show(1, 'a')
            self.preview.end()

    def test_a_shown_vehicle_reports_itself_loaded_on_the_hangar_change(self):
        self.preview.begin()
        self.preview.show(1, 'a')

        self.space.onVehicleChanged.fire()

        assert self.loaded == [True]

    def test_showing_selects_the_vehicle_in_the_stock_preview(self):
        self.preview.begin()

        self.preview.show(1, 'a')

        assert self.client_preview.selected == [(1, 'a')]

    def test_ending_a_swap_gives_the_selected_vehicle_back(self):
        self.preview.begin()
        self.preview.show(1, 'a')

        self.preview.end()

        assert self.client_preview.selected[-1] is None

    def test_the_camera_is_reset_once_the_vehicle_is_back(self):
        self.preview.begin()
        self.preview.show(1, 'a')
        self.preview.end()

        self.space.onVehicleChanged.fire()

        assert self.manager.resets == [0]

    def test_ending_the_preview_unsubscribes_from_the_hangar(self):
        self.preview.begin()

        self.preview.end()

        assert self.space.onVehicleChanged.delegates == []

    def test_ending_without_a_swap_leaves_the_camera(self):
        self.preview.begin()

        self.preview.end()

        assert self.manager.resets == []

    def test_ending_without_a_swap_resets_a_moved_camera(self):
        self.preview.begin()

        self.preview.end(reset_camera=True)

        assert self.manager.resets == [0]

    def test_reopening_before_the_camera_came_back_is_not_left_restoring(self):
        self.preview.begin()
        self.preview.show(1, 'a')
        self.preview.end()

        self.preview.begin()

        assert self.preview.restoring is False

    def test_a_late_restore_of_the_previous_opening_does_not_end_the_new_one(self):
        self.reopened_and_closed()

        self.callbacks[0]()

        assert self.preview.subscribed is not None

    def test_reopening_keeps_one_hangar_subscription(self):
        self.reopened_and_closed()

        self.callbacks[1]()

        assert self.space.onVehicleChanged.delegates == []

    def test_no_hangar_space_shows_nothing(self):
        self.preview.space = None

        assert self.preview.show(1, 'a') is False


if __name__ == '__main__':
    unittest.main()
