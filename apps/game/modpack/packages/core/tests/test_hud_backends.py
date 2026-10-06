# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import re
import unittest

import _support
from otmetki.core.hud import (
    ComponentConfig,
    HudBackend,
    HudLayer,
    HudSurface,
    NullBackend,
    alias_of,
    panel_schema,
)
from otmetki.core.hud.surface import (
    HUD_COMMANDS,
    HUD_PROTOCOL_VERSION,
    SPACE_BATTLE,
    SPACE_LOBBY,
    FramePush,
    decode_hud_message,
)
from otmetki.core.hud.surface.constants import MOUSE_EVENTS
from otmetki.core.i18n import Catalog, Translator
from _support import MemoryFile

HUD_PROTOCOL_DIR = os.path.join(_support.MODPACK_DIR, 'ui-web', 'src', 'shared', 'api', 'hud-protocol')
HUD_PROTOCOL_CONSTANTS = os.path.join(HUD_PROTOCOL_DIR, 'hud-protocol.constants.ts')
HUD_STATE_FIXTURE = os.path.join(HUD_PROTOCOL_DIR, '_tests', 'fixtures', 'hud-state.sample.json')
DAMAGE_LOG = 'otmetki.hud.damage_log'
HANGAR_INFO = 'otmetki.hangar_info'
MALFORMED_MESSAGES = (
    None,
    'not json',
    '[]',
    '{"type": "close"}',
    '{"type": "moved", "id": "x", "x": 1}',
    '{"type": "moved", "id": 5, "x": 1, "y": 2}',
    '{"type": "moved", "id": "x", "x": true, "y": 2}',
    'x' * 5000,
    '{"type": "resized", "id": "x", "scale": "big"}',
    '{"type": "pressed", "id": "x"}',
)


class Recorder(HudBackend):

    def __init__(self, name, available=True):
        self.name = name
        self.is_available = available
        self.labels = {}
        self.calls = []
        self.listeners = []
        self.drawn_listeners = []
        self.drawn = None

    def available(self):
        return self.is_available

    def drawn_aliases(self):
        return self.drawn

    def listen_drawn(self, on_drawn):
        self.drawn_listeners.append(on_drawn)

    def create(self, alias, props):
        self.calls.append(('create', alias))
        self.labels[alias] = dict(props)
        return True

    def update(self, alias, props):
        self.calls.append(('update', alias, dict(props)))
        self.labels[alias].update(props)
        return True

    def delete(self, alias):
        self.calls.append(('delete', alias))
        del self.labels[alias]
        return True

    def listen(self, on_moved):
        self.listeners.append(on_moved)


def damage_log_props():
    return {
        'text': u'<font color="#F2EAD3">урон 1 200</font>',
        'x': 20,
        'y': -140,
        'alignX': 'left',
        'alignY': 'bottom',
        'alpha': 0.9,
        'drag': True,
        'border': False,
        'visible': True,
        'hint': u'Нанесённый и полученный урон за бой.',
    }


def hint_translator():
    return Translator(Catalog({'ru': {'component_damage_log_hint': u'Урон за бой.'}}), 'ru')


def hangar_info_props():
    return {'text': '12:00', 'x': -10, 'y': 4, 'alignX': 'right', 'alignY': 'top'}


def moved_message():
    return json.dumps({
        'type': 'moved',
        'id': DAMAGE_LOG,
        'x': 30.6,
        'y': 99999,
        'align_x': 'center',
        'align_y': 'middle',
    })


def resized_message():
    return json.dumps({'type': 'resized', 'id': DAMAGE_LOG, 'scale': 9})


def names_in_list(source, key):
    block = re.search(key + r': \[([^\]]*)\]', source).group(1)
    return tuple(re.findall(r"'([a-z_]+)'", block))


def read_page_constants():
    with io.open(HUD_PROTOCOL_CONSTANTS, 'r', encoding='utf-8') as handle:
        return handle.read()


class NullBackendTest(unittest.TestCase):

    def test_the_null_backend_is_unavailable(self):
        assert not NullBackend().available()

    def test_the_null_backend_refuses_a_label(self):
        assert not NullBackend().create('a', {'text': '1'})

    def test_the_null_backend_confirms_nothing_drawn(self):
        assert NullBackend().drawn_aliases() is None


class LayerTest(unittest.TestCase):

    def setUp(self):
        self.backend = Recorder('fake')
        self.store = MemoryFile()
        self.layer = HudLayer(self.backend, ComponentConfig(self.store))
        self.layer.register('panel', panel_schema({'x': 5}))
        self.alias = alias_of('panel')

    def drag(self, props):
        return self.backend.listeners[0](self.alias, props)

    def test_unchanged_text_is_not_sent_again(self):
        self.layer.show('panel', 'one')
        self.layer.show('panel', 'one')
        self.layer.show('panel', 'two')
        self.layer.hide('panel')
        self.layer.show('panel', 'two')

        calls = [call[0] for call in self.backend.calls]
        assert calls == ['create', 'update', 'delete', 'create']

    def test_a_panel_is_not_drawn_until_the_renderer_says_so(self):
        self.layer.show('panel', 'one')

        assert not self.layer.draws('panel')

    def test_a_panel_the_renderer_draws_is_drawn(self):
        self.backend.drawn = frozenset([self.alias])

        assert self.layer.draws('panel')
        assert not self.layer.draws('other')

    def test_a_change_of_the_drawn_panels_reaches_the_watchers(self):
        seen = []
        self.layer.watch(lambda: seen.append(True))

        self.backend.drawn_listeners[0]()

        assert seen == [True]

    def test_place_of_a_hidden_panel_is_refused(self):
        assert not self.layer.place('panel', 1, 2)

    def test_place_sends_the_rounded_position(self):
        self.layer.show('panel', 'mark')

        placed = self.layer.place('panel', 10.4, -3)

        assert placed
        assert self.backend.calls[1:] == [('update', self.alias, {'x': 10, 'y': -3})]

    def test_placing_at_the_same_spot_sends_nothing_more(self):
        self.layer.show('panel', 'mark')
        self.layer.place('panel', 10.4, -3)

        placed = self.layer.place('panel', 10, -3)

        assert placed
        assert self.backend.calls[1:] == [('update', self.alias, {'x': 10, 'y': -3})]

    def test_a_placed_position_is_not_saved(self):
        self.layer.show('panel', 'mark')

        self.layer.place('panel', 10.4, -3)

        assert self.store.read()['panel']['x'] == 5

    def test_place_without_a_coordinate_is_refused(self):
        self.layer.show('panel', 'mark')

        assert not self.layer.place('panel', None, 1)

    def test_place_is_sent_again_after_the_settings_change(self):
        self.layer.show('panel', 'mark')
        self.layer.place('panel', 10, -3)
        self.layer.update_settings('panel', {'align_x': 'left'})

        placed = self.layer.place('panel', 10, -3)

        assert placed
        assert self.backend.calls[-1] == ('update', self.alias, {'x': 10, 'y': -3})

    def test_drag_saves_the_anchor(self):
        self.layer.show('panel', 'text')

        moved = self.drag({'x': 7, 'y': 8, 'alignX': 'right', 'alignY': 'bottom'})

        saved = self.store.read()['panel']
        assert moved
        assert saved['x'] == 7
        assert saved['y'] == 8
        assert saved['align_x'] == 'right'
        assert saved['align_y'] == 'bottom'

    def test_a_drag_of_mistyped_values_is_refused(self):
        self.layer.show('panel', 'text')

        assert not self.drag({'x': True, 'alignX': 'middle'})

    def test_a_resize_saves_the_scale_as_a_percent(self):
        self.layer.show('panel', 'text')

        resized = self.drag({'scale': 1.5})

        assert resized
        assert self.store.read()['panel']['scale'] == 150

    def test_a_shown_panel_carries_its_component_hint(self):
        layer = HudLayer(self.backend, ComponentConfig(self.store), hint_translator())
        layer.register('damage_log', panel_schema())

        layer.show('damage_log', 'text')

        assert self.backend.labels[alias_of('damage_log')]['hint'] == u'Урон за бой.'

    def test_a_panel_without_a_hint_string_carries_none(self):
        layer = HudLayer(self.backend, ComponentConfig(self.store), hint_translator())
        layer.register('panel', panel_schema())

        layer.show('panel', 'text')

        assert self.backend.labels[self.alias]['hint'] == u''

    def test_the_layer_reports_its_backend_name(self):
        assert self.layer.backend.name == 'fake'


class FramePushTest(unittest.TestCase):

    def setUp(self):
        self.frames = []
        self.sent = []
        self.surface = HudSurface()
        self.view = True
        self.pusher = FramePush(self.frames.append, self.encode, self.sent.append)

    def encode(self):
        if not self.view:
            return None
        return self.surface.encode(SPACE_BATTLE, False)

    def next_frame(self):
        frames, self.frames[:] = list(self.frames), []
        for flush in frames:
            flush()

    def change_the_clock_three_times(self):
        self.surface.create('clock', {'text': '1'}, SPACE_BATTLE)
        for text in ('2', '3', '4'):
            self.surface.update('clock', {'text': text})
            self.pusher.request()

    def push_the_same_state_twice(self):
        self.surface.create('clock', {'text': '1'}, SPACE_BATTLE)
        self.pusher.request()
        self.next_frame()
        self.surface.update('clock', {'text': '1'})
        self.pusher.request()
        self.next_frame()

    def test_changes_within_one_frame_ask_for_one_frame_and_send_nothing_yet(self):
        self.change_the_clock_three_times()

        assert len(self.frames) == 1
        assert self.sent == []

    def test_the_frame_pushes_the_latest_state_once(self):
        self.change_the_clock_three_times()

        self.next_frame()

        assert len(self.sent) == 1
        assert json.loads(self.sent[0])['panels'][0]['text'] == '4'

    def test_an_unchanged_state_is_not_pushed_again(self):
        self.push_the_same_state_twice()

        assert len(self.sent) == 1

    def test_a_new_page_gets_the_unchanged_state_again(self):
        self.push_the_same_state_twice()
        self.pusher.forget()

        flushed = self.pusher.flush()

        assert flushed is True
        assert len(self.sent) == 2

    def test_no_page_no_push(self):
        self.view = False

        self.pusher.request()
        self.next_frame()

        assert self.sent == []
        assert not self.pusher.pending


class SurfaceTest(unittest.TestCase):

    def setUp(self):
        self.surface = HudSurface()
        self.surface.create(DAMAGE_LOG, damage_log_props(), SPACE_BATTLE)
        self.surface.create(HANGAR_INFO, hangar_info_props(), SPACE_LOBBY)

    def test_the_state_carries_the_protocol_version_and_the_modes(self):
        state = self.surface.state(SPACE_BATTLE, False)

        assert state['v'] == HUD_PROTOCOL_VERSION
        assert state['cursor'] is False
        assert state['edit'] is False

    def test_the_state_lists_only_the_panels_of_its_space(self):
        state = self.surface.state(SPACE_BATTLE, False)

        assert [panel['id'] for panel in state['panels']] == [DAMAGE_LOG]

    def test_a_panel_is_filled_with_the_defaults(self):
        panel = self.surface.state(SPACE_LOBBY, True)['panels'][0]

        assert panel == {
            'id': 'otmetki.hangar_info',
            'text': '12:00',
            'x': -10,
            'y': 4,
            'align_x': 'right',
            'align_y': 'top',
            'alpha': 1.0,
            'drag': False,
            'border': False,
            'visible': True,
            'scale': 1.0,
            'widget': None,
            'dock': None,
            'attach': None,
            'hint': '',
        }

    def test_edit_mode_needs_the_cursor(self):
        assert self.surface.state(SPACE_LOBBY, False, True)['edit'] is False

    def test_edit_mode_with_the_cursor_is_on(self):
        assert self.surface.state(SPACE_LOBBY, True, True)['edit'] is True

    def test_hover_is_on_while_editing_with_the_cursor(self):
        assert self.surface.state(SPACE_BATTLE, True, True)['hover'] is True

    def test_hover_is_off_outside_edit_mode(self):
        assert self.surface.state(SPACE_LOBBY, True)['hover'] is False

    def test_encode_keeps_the_panel_text(self):
        encoded = json.loads(self.surface.encode(SPACE_BATTLE, True))

        assert encoded['panels'][0]['text'].endswith(u'урон 1 200</font>')

    def test_update_sets_the_text_and_resets_a_missing_value(self):
        updated = self.surface.update(HANGAR_INFO, {'text': '12:01', 'x': None})

        assert updated
        assert self.surface.panel(HANGAR_INFO)['text'] == '12:01'
        assert self.surface.panel(HANGAR_INFO)['x'] == 0

    def test_update_of_a_missing_panel_is_refused(self):
        assert not self.surface.update('missing', {})

    def test_delete_removes_the_panel_from_its_space(self):
        deleted = self.surface.delete(HANGAR_INFO)

        assert deleted
        assert self.surface.aliases(SPACE_LOBBY) == []

    def test_a_deleted_panel_cannot_be_deleted_again(self):
        self.surface.delete(HANGAR_INFO)

        assert not self.surface.delete(HANGAR_INFO)


class HudMessageTest(unittest.TestCase):

    def setUp(self):
        self.surface = HudSurface()
        self.surface.create(DAMAGE_LOG, damage_log_props(), SPACE_BATTLE)
        self.surface.create(HANGAR_INFO, hangar_info_props(), SPACE_LOBBY)

    def test_ready_is_decoded(self):
        assert decode_hud_message('{"type": "ready"}') == ('ready', {})

    def test_a_known_mouse_event_is_decoded(self):
        assert decode_hud_message('{"type": "mouse", "event": "hover"}') == ('mouse', {'event': 'hover'})

    def test_the_drawn_panels_are_decoded(self):
        decoded = decode_hud_message(json.dumps({'type': 'drawn', 'ids': [DAMAGE_LOG, HANGAR_INFO]}))

        assert decoded == ('drawn', {'ids': (DAMAGE_LOG, HANGAR_INFO)})

    def test_no_drawn_panel_is_decoded_as_none_drawn(self):
        assert decode_hud_message('{"type": "drawn", "ids": []}') == ('drawn', {'ids': ()})

    def test_drawn_panels_that_are_not_names_are_refused(self):
        for ids in (None, 'x', [1], [None]):
            assert decode_hud_message(json.dumps({'type': 'drawn', 'ids': ids})) is None, ids

    def test_the_input_area_report_is_decoded(self):
        assert decode_hud_message('{"type": "area", "whole": true}') == ('area', {'whole': True})

    def test_an_input_area_report_without_a_flag_is_refused(self):
        for whole in (None, 1, 'yes'):
            assert decode_hud_message(json.dumps({'type': 'area', 'whole': whole})) is None, whole

    def test_an_unknown_mouse_event_is_refused(self):
        assert decode_hud_message('{"type": "mouse", "event": "click"}') is None

    def test_every_malformed_message_is_refused(self):
        for raw in MALFORMED_MESSAGES:
            assert decode_hud_message(raw) is None, raw

    def test_moved_is_rounded_and_clamped(self):
        moved = self.surface.handle(moved_message())

        assert moved == ('moved', {'id': 'otmetki.hud.damage_log', 'x': 31, 'y': 4000, 'alignX': 'center'})

    def test_moved_updates_the_panel(self):
        self.surface.handle(moved_message())

        assert self.surface.panel(DAMAGE_LOG)['align_x'] == 'center'

    def test_moved_of_an_unknown_panel_is_ignored(self):
        assert self.surface.handle('{"type": "moved", "id": "unknown", "x": 1, "y": 2}') is None

    def test_resized_is_clamped(self):
        resized = self.surface.handle(resized_message())

        assert resized == ('resized', {'id': 'otmetki.hud.damage_log', 'scale': 3.0})

    def test_resized_updates_the_panel(self):
        self.surface.handle(resized_message())

        assert self.surface.panel(DAMAGE_LOG)['scale'] == 3.0


class HudPageContractTest(unittest.TestCase):

    def test_state_fixture_is_current(self):
        surface = HudSurface()
        surface.create(DAMAGE_LOG, damage_log_props(), SPACE_BATTLE)
        surface.create(HANGAR_INFO, hangar_info_props(), SPACE_LOBBY)

        state = surface.state(SPACE_BATTLE, True, True)

        if os.environ.get('OTMETKI_UPDATE_FIXTURES') == '1':
            _support.write_fixture(HUD_STATE_FIXTURE, state)
        with io.open(HUD_STATE_FIXTURE, 'r', encoding='utf-8') as handle:
            assert json.load(handle) == state

    def test_commands_match_the_page(self):
        assert names_in_list(read_page_constants(), 'commands') == HUD_COMMANDS

    def test_protocol_version_matches_the_page(self):
        version = re.search(r'version: (\d+)', read_page_constants()).group(1)

        assert version == str(HUD_PROTOCOL_VERSION)

    def test_mouse_events_match_the_page(self):
        assert names_in_list(read_page_constants(), 'mouseEvents') == MOUSE_EVENTS


if __name__ == '__main__':
    unittest.main()
