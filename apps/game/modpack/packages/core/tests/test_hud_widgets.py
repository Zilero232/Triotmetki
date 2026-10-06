# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import re
import unittest

import _support
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer, panel_schema
from otmetki.core.hud.icons import (
    artefact_icon,
    class_icon,
    efficiency_icon,
    flag_icon,
    glyph,
    item_name,
    mark_icon,
    outcome_icon,
    resolve,
    shell_icon,
    split,
    tier_icon,
)
from otmetki.core.hud.stock import (
    BATTLE_DAMAGE_LOG_PANEL,
    FRAG_CORRELATION_BAR,
    RETICLE_PARTS,
    RETICLE_RELOAD_TIMER,
    SIXTH_SENSE,
    StockSuppression,
    hide_reticle_parts,
)
from otmetki.core.hud.surface import SPACE_BATTLE, HudSurface
from otmetki.core.hud.widget import TONES, WIDGET_VERSION, color_override, tone, widget
from _support import MemoryFile

HUD_PROTOCOL_CONSTANTS = os.path.join(
    _support.MODPACK_DIR,
    'ui-web',
    'src',
    'shared',
    'api',
    'hud-protocol',
    'hud-protocol.constants.ts',
)


class Recorder(HudBackend):

    name = 'gameface'

    def __init__(self):
        self.calls = []

    def available(self):
        return True

    def create(self, alias, props):
        self.calls.append(('create', dict(props)))
        return True

    def update(self, alias, props):
        self.calls.append(('update', dict(props)))
        return True

    def delete(self, alias):
        self.calls.append(('delete', alias))
        return True


def read_hud_protocol_constants():
    with io.open(HUD_PROTOCOL_CONSTANTS, encoding='utf-8') as handle:
        return handle.read()


def page_tones(source):
    tone_list = re.search(r'tones: \[([^\]]*)\]', source).group(1)
    return tuple(re.findall(r"'([a-z]+)'", tone_list))


def page_widget_version(source):
    return re.search(r'widgetVersion: (\d+)', source).group(1)


def layer_with_a_panel(backend):
    layer = HudLayer(backend, ComponentConfig(MemoryFile()))
    layer.register('panel', panel_schema({}))
    return layer


def hidden_layer_with_a_held_widget(backend):
    layer = layer_with_a_panel(backend)
    layer.show('panel', 'text', widget('x', {}))
    layer.set_gui_hidden(True)
    layer.show('panel', 'next', widget('x', {'n': 3}))
    return layer


def payload_with_client_icons():
    row = {'icon': class_icon('SPG'), 'shell': artefact_icon('gone'), 'name': 'img'}
    return {'rows': [row], 'plain': 'x'}


def stock_shared_by_two_owners():
    stock = StockSuppression()
    stock.want('a', (SIXTH_SENSE,))
    stock.want('b', (SIXTH_SENSE, BATTLE_DAMAGE_LOG_PANEL))
    return stock


class WidgetPayloadTest(unittest.TestCase):

    def test_payload_shape(self):
        payload = widget('team_hp', {'a': 1})

        assert payload == {'kind': 'team_hp', 'v': WIDGET_VERSION, 'data': {'a': 1}}

    def test_known_tone_is_kept(self):
        assert tone('accent') == 'accent'

    def test_unknown_tone_falls_back_to_text(self):
        assert tone('pink') == 'text'

    def test_missing_tone_takes_the_given_fallback(self):
        assert tone(None, 'muted') == 'muted'

    def test_a_colour_other_than_the_default_overrides_the_tone(self):
        assert color_override('#00ff00', '#7CD35B') == '#00FF00'

    def test_the_default_colour_leaves_the_tone(self):
        assert color_override('#7cd35b', '#7CD35B') is None

    def test_a_bad_colour_leaves_the_tone(self):
        assert color_override('green', '#7CD35B') is None

    def test_tones_match_the_page(self):
        source = read_hud_protocol_constants()

        assert page_tones(source) == TONES

    def test_version_matches_the_page(self):
        source = read_hud_protocol_constants()

        assert page_widget_version(source) == str(WIDGET_VERSION)

    def test_layer_sends_the_widget_and_skips_an_unchanged_one(self):
        backend = Recorder()
        layer = layer_with_a_panel(backend)
        payload = widget('x', {'n': 1})

        layer.show('panel', 'text', payload)
        layer.show('panel', 'text', payload)
        layer.show('panel', 'text', widget('x', {'n': 2}))

        assert [call[0] for call in backend.calls] == ['create', 'update']
        assert backend.calls[0][1]['widget'] == payload
        assert backend.calls[1][1]['widget']['data'] == {'n': 2}

    def test_hidden_gui_makes_the_panel_invisible_in_place(self):
        backend = Recorder()
        layer = layer_with_a_panel(backend)
        layer.show('panel', 'text', widget('x', {}))

        layer.set_gui_hidden(True)

        assert backend.calls[-1] == ('update', {'visible': False})

    def test_a_panel_updated_while_the_gui_is_hidden_stays_invisible(self):
        backend = Recorder()

        hidden_layer_with_a_held_widget(backend)

        assert backend.calls[-1][1]['visible'] is False
        assert backend.calls[-1][1]['widget']['data'] == {'n': 3}

    def test_shown_gui_makes_the_same_panel_visible_without_creating_it_again(self):
        backend = Recorder()
        layer = hidden_layer_with_a_held_widget(backend)

        layer.set_gui_hidden(False)

        assert backend.calls[-1] == ('update', {'visible': True})
        assert [call[0] for call in backend.calls].count('create') == 1

    def test_full_stats_keeps_the_panel_and_hides_it(self):
        backend = Recorder()
        layer = layer_with_a_panel(backend)
        layer.show('panel', 'text', widget('x', {}))

        layer.set_full_stats(True)

        assert backend.calls[-1] == ('update', {'visible': False})
        assert 'delete' not in [call[0] for call in backend.calls]

    def test_closed_full_stats_shows_the_panel_again(self):
        backend = Recorder()
        layer = layer_with_a_panel(backend)
        layer.show('panel', 'text', widget('x', {}))
        layer.set_full_stats(True)

        layer.set_full_stats(False)

        assert backend.calls[-1] == ('update', {'visible': True})

    def test_surface_keeps_a_dict_widget(self):
        surface = HudSurface()

        surface.create('a', {'text': 't', 'widget': widget('k', {})}, SPACE_BATTLE)

        assert surface.panel('a')['widget']['kind'] == 'k'

    def test_surface_drops_a_widget_that_is_not_a_dict(self):
        surface = HudSurface()

        surface.create('b', {'text': 't', 'widget': 'bad'}, SPACE_BATTLE)

        assert surface.panel('b')['widget'] is None


class ClassIconTest(unittest.TestCase):

    def test_white_class_icon_keeps_the_client_file_name(self):
        assert class_icon('AT-SPG') == 'img://gui/maps/icons/vehicleTypes/white/AT-SPG.png|otmetki:class_td'

    def test_red_td_icon_is_lower_case(self):
        assert class_icon('AT-SPG', 'red').startswith('img://gui/maps/icons/vehicleTypes/red/at-spg.png')

    def test_green_spg_icon_is_lower_case(self):
        assert class_icon('SPG', 'green').startswith('img://gui/maps/icons/vehicleTypes/green/spg.png')

    def test_gold_heavy_icon_keeps_the_camel_case(self):
        assert class_icon('heavyTank', 'gold').startswith('img://gui/maps/icons/vehicleTypes/gold/heavyTank.png')

    def test_unknown_class_has_no_icon(self):
        assert class_icon('ufo') is None

    def test_unknown_color_falls_back_to_white(self):
        assert class_icon('lightTank', 'blue').startswith('img://gui/maps/icons/vehicleTypes/white/')


class ShellIconTest(unittest.TestCase):

    def test_battle_log_name(self):
        icon = shell_icon('HE_LEGACY_STUN')

        assert icon.startswith('img://gui/maps/icons/shell/small/HIGH_EXPLOSIVE_SPG_STUN.png')

    def test_premium_shell(self):
        icon = shell_icon('ARMOR_PIERCING_CR', premium=True)

        assert icon.startswith('img://gui/maps/icons/shell/small/ARMOR_PIERCING_CR_PREMIUM.png')

    def test_descriptor_stem_in_the_ammo_panel_folder(self):
        icon = shell_icon('ARMOR_PIERCING_CR_PREMIUM.png', premium=True, kind='battle_ammo')

        assert icon.startswith('img://gui/maps/icons/ammopanel/battle_ammo/ARMOR_PIERCING_CR_PREMIUM.png')

    def test_bad_name_has_no_icon(self):
        assert shell_icon('bad name') is None

    def test_missing_name_has_no_icon(self):
        assert shell_icon(None) is None


class ClientIconTest(unittest.TestCase):

    def test_artefact_icon_from_a_descriptor_path(self):
        icon = artefact_icon(('../maps/icons/artefact/largeRepairkit.png',))

        assert icon == 'img://gui/maps/icons/artefact/largeRepairkit.png'

    def test_artefact_icon_from_a_name(self):
        assert artefact_icon('rammer') == 'img://gui/maps/icons/artefact/rammer.png'

    def test_missing_artefact_has_no_icon(self):
        assert artefact_icon(None) is None

    def test_efficiency_icon(self):
        assert efficiency_icon('help').startswith('img://gui/maps/icons/library/efficiency/48x48/help.png')

    def test_unknown_efficiency_has_no_icon(self):
        assert efficiency_icon('x') is None

    def test_penetration_outcome_is_our_glyph(self):
        assert outcome_icon('pen') == 'otmetki:damage'

    def test_ricochet_outcome_is_the_client_icon_with_our_fallback(self):
        assert outcome_icon('ricochet').endswith('hit_ricochet.png|otmetki:blocked')

    def test_mark_icon_caps_at_three_marks(self):
        assert mark_icon(5).startswith('img://gui/maps/icons/library/marksOnGun/mark_3.png')

    def test_no_mark_icon_without_marks(self):
        assert mark_icon(0) is None

    def test_flag_icon(self):
        assert flag_icon('ussr') == 'img://gui/maps/icons/flags/25x17/ussr.png'

    def test_unknown_nation_has_no_flag(self):
        assert flag_icon('mars') is None

    def test_tier_icon(self):
        assert tier_icon(10) == 'img://gui/maps/icons/levels/tank_level_small_10.png'

    def test_unknown_tier_has_no_icon(self):
        assert tier_icon(12) is None

    def test_item_name_is_the_file_stem(self):
        assert item_name('..\\x\\y.png') == 'y'

    def test_a_path_without_a_file_has_no_item_name(self):
        assert item_name('../..') is None

    def test_glyph_is_our_icon_name(self):
        assert glyph('fire') == 'otmetki:fire'


class ResolveTest(unittest.TestCase):

    def test_missing_client_files_fall_back_to_our_glyph(self):
        payload = payload_with_client_icons()

        resolved = resolve(payload, lambda path: 'vehicleTypes' not in path)

        expected = {'icon': 'otmetki:class_spg', 'shell': 'img://gui/maps/icons/artefact/gone.png', 'name': 'img'}
        assert resolved['rows'][0] == expected

    def test_a_missing_client_file_without_a_glyph_is_dropped(self):
        payload = payload_with_client_icons()

        resolved = resolve(payload, lambda path: False)

        assert resolved['rows'][0]['shell'] is None

    def test_split_a_client_icon_with_a_fallback(self):
        assert split('img://a.png|otmetki:b') == ('a.png', 'otmetki:b')

    def test_split_our_glyph(self):
        assert split('otmetki:c') == (None, 'otmetki:c')

    def test_split_garbage(self):
        assert split(3) == (None, None)


class StockSuppressionTest(unittest.TestCase):

    def test_want_reports_the_known_aliases_to_hide(self):
        stock = StockSuppression()

        changes = stock.want('team_hp', (FRAG_CORRELATION_BAR, 'unknownAlias'))

        assert changes == (frozenset([FRAG_CORRELATION_BAR]), frozenset())

    def test_suppressed_aliases_never_come_back_while_wanted(self):
        stock = StockSuppression()
        stock.want('team_hp', (FRAG_CORRELATION_BAR,))

        visible, hidden = stock.filter({FRAG_CORRELATION_BAR, 'minimap'}, set())

        assert visible == {'minimap'}
        assert hidden == {FRAG_CORRELATION_BAR}

    def test_an_alias_another_owner_wants_stays_hidden(self):
        stock = stock_shared_by_two_owners()

        changes = stock.want('a', ())

        assert changes == (frozenset(), frozenset())

    def test_the_last_owner_releasing_an_alias_shows_it(self):
        stock = stock_shared_by_two_owners()
        stock.want('a', ())

        changes = stock.want('b', (SIXTH_SENSE,))

        assert changes == (frozenset(), frozenset([BATTLE_DAMAGE_LOG_PANEL]))

    def test_aliases_are_every_alias_any_owner_hides(self):
        stock = stock_shared_by_two_owners()

        assert stock.aliases == frozenset([SIXTH_SENSE, BATTLE_DAMAGE_LOG_PANEL])

    def test_filter_without_sets_is_empty(self):
        assert StockSuppression().filter(None, None) == (set(), set())


class ReticlePartsTest(unittest.TestCase):

    def test_a_suppression_over_reticle_parts_keeps_only_those(self):
        parts = StockSuppression(RETICLE_PARTS)

        changes = parts.want('crosshair', (RETICLE_RELOAD_TIMER, SIXTH_SENSE))

        assert changes == (frozenset([RETICLE_RELOAD_TIMER]), frozenset())

    def test_a_hidden_part_gets_opacity_zero_in_every_view(self):
        settings = {1: {RETICLE_RELOAD_TIMER: 1.0}, 2: {RETICLE_RELOAD_TIMER: 0.6}}

        hidden = hide_reticle_parts(settings, (RETICLE_RELOAD_TIMER,))

        assert hidden == {1: {RETICLE_RELOAD_TIMER: 0.0}, 2: {RETICLE_RELOAD_TIMER: 0.0}}

    def test_hiding_leaves_the_client_settings_untouched(self):
        settings = {1: {RETICLE_RELOAD_TIMER: 1.0, 'netAlphaValue': 0.5}}

        hide_reticle_parts(settings, (RETICLE_RELOAD_TIMER,))

        assert settings == {1: {RETICLE_RELOAD_TIMER: 1.0, 'netAlphaValue': 0.5}}

    def test_other_keys_keep_their_values(self):
        settings = {1: {RETICLE_RELOAD_TIMER: 1.0, 'netAlphaValue': 0.5}}

        hidden = hide_reticle_parts(settings, (RETICLE_RELOAD_TIMER,))

        assert hidden[1]['netAlphaValue'] == 0.5

    def test_nothing_to_hide_returns_the_same_settings(self):
        settings = {1: {RETICLE_RELOAD_TIMER: 1.0}}

        assert hide_reticle_parts(settings, ()) is settings

    def test_a_view_without_the_part_gains_nothing(self):
        settings = {3: {'spgScaleWidgetEnabled': True}}

        hidden = hide_reticle_parts(settings, (RETICLE_RELOAD_TIMER,))

        assert hidden == {3: {'spgScaleWidgetEnabled': True}}

    def test_unexpected_settings_pass_through(self):
        assert hide_reticle_parts(None, (RETICLE_RELOAD_TIMER,)) is None


if __name__ == '__main__':
    unittest.main()
