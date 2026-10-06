# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import json
import unittest

import _support
from otmetki.core.hud.surface import SPACE_BATTLE, SPACE_LOBBY, HudSurface

DAMAGE_LOG = 'otmetki.hud.damage_log'
TEAM_HP = 'otmetki.hud.team_hp'
WIDGET = {'kind': 'damage_log', 'v': 1, 'data': {'rows': [{'text': u'Т-34-85 · 390'}]}}


class EncodeCountingSurface(HudSurface):

    def __init__(self):
        HudSurface.__init__(self)
        self.encoded = []

    def panel(self, alias):
        self.encoded.append(alias)
        return HudSurface.panel(self, alias)


def battle_surface():
    surface = EncodeCountingSurface()
    surface.create(DAMAGE_LOG, {'text': u'Журнал боя', 'x': 10, 'widget': WIDGET}, SPACE_BATTLE)
    surface.create(TEAM_HP, {'text': '15 : 15', 'x': 20}, SPACE_BATTLE)
    return surface


class BadPanelTest(unittest.TestCase):

    def setUp(self):
        self.surface = battle_surface()
        self.surface.update(TEAM_HP, {'widget': {'kind': 'team_hp', 'data': set([1])}})

    def encoded_panels(self):
        return {panel['id']: panel for panel in json.loads(self.surface.encode(SPACE_BATTLE, False))['panels']}

    def test_a_panel_that_is_not_json_leaves_the_others_drawn(self):
        self.assertEqual(self.encoded_panels()[DAMAGE_LOG]['widget'], WIDGET)

    def test_a_panel_that_is_not_json_is_sent_hidden(self):
        self.assertFalse(self.encoded_panels()[TEAM_HP]['visible'])

    def test_a_panel_that_is_not_json_is_logged_once(self):
        lines = []

        with _support.captured_log(lines):
            for _ in range(3):
                self.surface.encode(SPACE_BATTLE, False)

        self.assertEqual(len(lines), 1)

    def test_a_bad_panel_that_is_fixed_is_drawn_again(self):
        self.surface.encode(SPACE_BATTLE, False)

        self.surface.update(TEAM_HP, {'widget': {'kind': 'team_hp', 'data': [1]}})

        self.assertTrue(self.encoded_panels()[TEAM_HP]['visible'])


class HudSurfaceFragmentTest(unittest.TestCase):

    def test_the_encoded_state_is_the_state(self):
        surface = battle_surface()

        encoded = json.loads(surface.encode(SPACE_BATTLE, True, True))

        self.assertEqual(encoded, surface.state(SPACE_BATTLE, True, True))

    def test_the_encoded_state_of_an_empty_space_has_no_panels(self):
        surface = battle_surface()

        encoded = json.loads(surface.encode(SPACE_LOBBY, False))

        self.assertEqual(encoded['panels'], [])

    def test_a_second_push_encodes_no_panel_again(self):
        surface = battle_surface()
        surface.encode(SPACE_BATTLE, False)
        del surface.encoded[:]

        surface.encode(SPACE_BATTLE, True)

        self.assertEqual(surface.encoded, [])

    def test_a_changed_panel_is_the_only_one_encoded_again(self):
        surface = battle_surface()
        surface.encode(SPACE_BATTLE, False)
        del surface.encoded[:]

        surface.update(TEAM_HP, {'text': '14 : 15'})
        encoded = json.loads(surface.encode(SPACE_BATTLE, False))

        self.assertEqual(surface.encoded, [TEAM_HP])
        self.assertEqual(encoded['panels'][1]['text'], '14 : 15')

    def test_an_update_with_the_same_props_keeps_the_fragment(self):
        surface = battle_surface()
        surface.encode(SPACE_BATTLE, False)
        del surface.encoded[:]

        surface.update(TEAM_HP, {'text': '15 : 15', 'x': 20})
        surface.encode(SPACE_BATTLE, False)

        self.assertEqual(surface.encoded, [])

    def test_a_widget_sent_again_as_the_same_object_is_encoded_again(self):
        widget = {'kind': 'team_hp', 'v': 1, 'data': {'allies': 15}}
        surface = battle_surface()
        surface.update(TEAM_HP, {'widget': widget})
        surface.encode(SPACE_BATTLE, False)
        del surface.encoded[:]

        widget['data']['allies'] = 14
        surface.update(TEAM_HP, {'widget': widget})
        encoded = json.loads(surface.encode(SPACE_BATTLE, False))

        self.assertEqual(encoded['panels'][1]['widget']['data']['allies'], 14)

    def test_a_label_created_again_is_encoded_again(self):
        surface = battle_surface()
        surface.encode(SPACE_BATTLE, False)

        surface.create(TEAM_HP, {'text': '1 : 1'}, SPACE_BATTLE)
        encoded = json.loads(surface.encode(SPACE_BATTLE, False))

        self.assertEqual(encoded['panels'][1]['text'], '1 : 1')

    def test_a_deleted_label_leaves_the_state(self):
        surface = battle_surface()
        surface.encode(SPACE_BATTLE, False)

        surface.delete(TEAM_HP)
        encoded = json.loads(surface.encode(SPACE_BATTLE, False))

        self.assertEqual([panel['id'] for panel in encoded['panels']], [DAMAGE_LOG])

    def test_the_page_message_moving_a_panel_reaches_its_fragment(self):
        surface = battle_surface()
        surface.encode(SPACE_BATTLE, False)

        surface.handle(json.dumps({'type': 'moved', 'id': TEAM_HP, 'x': 300, 'y': 40}))
        encoded = json.loads(surface.encode(SPACE_BATTLE, False))

        self.assertEqual(encoded['panels'][1]['x'], 300)

    def test_cyrillic_text_survives_the_encoding(self):
        surface = battle_surface()

        encoded = json.loads(surface.encode(SPACE_BATTLE, False))

        self.assertEqual(encoded['panels'][0]['text'], u'Журнал боя')
