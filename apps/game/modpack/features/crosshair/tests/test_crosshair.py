from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import unittest

import _support
from otmetki.core.native_settings import client_keys, merge_value, native_choices
from otmetki.core.settings import Settings
from otmetki.features.crosshair.i18n import STRINGS
from otmetki.features.crosshair.model import (
    mark_html,
    mark_image,
    mark_offset,
    mark_text,
    normalize_mark,
    shows_in,
    to_native,
)
from otmetki.features.crosshair.model.constants import (
    EDITOR_GROUPS,
    MARK_COLORS,
    MARK_FILES,
    MARK_RENDITIONS,
    PRESET_PARTS,
    RETIRED_MARKS,
    VECTOR_MARKS,
    VECTOR_RENDITIONS,
)
from otmetki.features.crosshair.model.editor import editor
from otmetki.features.crosshair.model.preview import preview_text, preview_widget, sample_readouts
from otmetki.core.hud.stock import RETICLE_CASSETTE, RETICLE_CONDITION, RETICLE_RELOAD, RETICLE_RELOAD_TIMER
from otmetki.features.crosshair.model.readouts import (
    Readouts,
    readouts_data,
    reload_left,
    replaced_reticle_parts,
    wants_readouts,
)
from otmetki.features.crosshair.model.widget import crosshair_widget
from otmetki.features.crosshair.settings import SCHEMA, SETTINGS
from otmetki.features.crosshair.settings.constants import MARKS

ASSETS_DIR = os.path.join(_support.MODPACK_DIR, 'assets')

# The parts of the game's own "Reticle" settings tab, RU 1.45 client source (options.AimSetting): an opacity 0-100,
# or a style index below the number of styles the settings window offers (AimSetting.VIRTUAL_OPTIONS).
OPACITY_PARTS = (
    'net',
    'centralTag',
    'mixing',
    'gunTag',
    'reloader',
    'reloaderTimer',
    'condition',
    'cassette',
    'zoomIndicator',
)
# The fields the settings window shows: the schema without the panel position keys (packages/ui PANEL_POSITION_KEYS).
FIELD_KEYS = (
    'preset',
    'modes',
    'server_reticle',
    'mark',
    'mark_size',
    'mark_color',
    'mark_outline',
    'mark_hides_centre',
    'reload_box',
    'reload_arcs',
)
STYLE_COUNTS = {'netType': 4, 'centralTagType': 14, 'mixingType': 4, 'gunTagType': 15}


def shipped_images():
    with io.open(os.path.join(ASSETS_DIR, 'assets.json'), encoding='utf-8') as handle:
        sets = json.load(handle)['sets']
    paths = set()
    for item in sets:
        folder = os.path.join(ASSETS_DIR, *item['files'].split('/'))
        client_folder = item['target'][len('res/'):]
        for name in os.listdir(folder):
            paths.add(client_folder + '/' + name)
    return paths


def native(values):
    chosen = native_choices(client_keys(SCHEMA))
    chosen.update(values)
    return to_native(Settings(chosen, SCHEMA).to_dict())


def is_valid_part_value(part, value):
    if part in OPACITY_PARTS:
        return 0 <= value <= 100
    if part in STYLE_COUNTS:
        return 0 <= value < STYLE_COUNTS[part]
    return False


class PresetTest(unittest.TestCase):

    def test_native_values_change_nothing_without_a_mark(self):
        assert native({'mark': 'none'}) == {}

    def test_the_default_is_the_minimal_preset_with_the_games_own_centre(self):
        result = to_native(Settings(None, SCHEMA).to_dict())

        assert result['arcade'] == PRESET_PARTS['minimal']

    def test_a_picked_mark_takes_the_place_of_the_game_centre(self):
        result = to_native(Settings({'mark': 'chevron_thin'}, SCHEMA).to_dict())

        assert result['arcade'] == dict(PRESET_PARTS['minimal'], centralTag=0)

    def test_the_client_values_are_the_preset_and_the_server_reticle(self):
        assert client_keys(SCHEMA) == ('preset', 'server_reticle')

    def test_the_minimal_preset_is_the_recommended_reticle(self):
        expected = {
            'net': 0,
            'centralTag': 100,
            'centralTagType': 0,
            'mixing': 60,
            'gunTag': 100,
            'reloader': 60,
            'reloaderTimer': 100,
            'condition': 0,
            'cassette': 100,
            'zoomIndicator': 0,
        }

        assert PRESET_PARTS['minimal'] == expected

    def test_the_component_switch_is_crosshair_presets(self):
        assert SETTINGS == ('crosshair_presets',)

    def test_a_preset_for_both_modes_sets_both_reticles(self):
        result = native({'preset': 'minimal', 'mark': 'none'})

        assert sorted(result) == ['arcade', 'sniper']
        assert result['arcade'] == PRESET_PARTS['minimal']

    def test_a_sniper_only_preset_sets_the_sniper_reticle_and_the_server_reticle(self):
        result = native({'preset': 'clean', 'modes': 'sniper', 'server_reticle': 'on'})

        assert sorted(result) == ['sniper', 'useServerAim']
        assert result['useServerAim'] is True

    def test_presets_only_set_reticle_parts_within_the_game_ranges(self):
        for name, parts in PRESET_PARTS.items():
            for part, value in parts.items():
                assert is_valid_part_value(part, value), (name, part, value)

    def test_a_preset_keeps_the_players_other_parts(self):
        current = {'net': 50, 'netType': 2, 'centralTag': 100, 'custom': 7}

        merged = merge_value(current, PRESET_PARTS['clean'])

        assert merged['netType'] == 2
        assert merged['custom'] == 7
        assert merged['net'] == 0

    def test_a_plain_value_replaces_the_players_value(self):
        assert merge_value(True, False) is False


class CentreMarkImageTest(unittest.TestCase):

    def test_the_mark_choices_are_the_shipped_marks_and_none(self):
        assert set(MARKS) == set(MARK_FILES) | set(['none'])

    def test_every_vector_mark_ships_in_every_colour_plain_and_outlined(self):
        shipped = shipped_images()

        for mark in VECTOR_MARKS:
            for color in MARK_COLORS:
                for outline in (False, True):
                    assert mark_image(mark, VECTOR_RENDITIONS[0], color, outline) in shipped, (mark, color, outline)

    def test_every_full_colour_mark_ships_in_every_rendition(self):
        shipped = shipped_images()

        for mark in set(MARK_FILES) - set(VECTOR_MARKS):
            for size in MARK_RENDITIONS:
                assert mark_image(mark, size) in shipped, (mark, size)

    def test_a_vector_mark_comes_in_the_chosen_colour(self):
        assert mark_image('ring', 48, 'lime').endswith('/vector/ring_lime_64.png')

    def test_the_outline_has_its_own_rendition(self):
        assert mark_image('chevron_thin', 32, 'orange', True).endswith('/vector/chevron_thin_o_orange_64.png')

    def test_an_unknown_colour_falls_back_to_white(self):
        assert mark_image('ring', 48, 'bogus').endswith('/vector/ring_white_64.png')

    def test_a_full_colour_mark_ignores_the_colour(self):
        assert mark_image('triad', 48, 'lime').endswith('/otmetki/triad_64.png')

    def test_the_settings_reject_an_unknown_colour(self):
        assert Settings({'mark_color': 'purple'}, SCHEMA).get('mark_color') == 'orange'

    def test_a_full_colour_image_is_the_smallest_rendition_not_below_the_size(self):
        assert mark_image('kenney_scope', 100).endswith('/kenney/crosshair-196_128.png')

    def test_a_size_above_every_rendition_takes_the_largest(self):
        assert mark_image('triad', 200).endswith('_128.png')

    def test_no_mark_has_no_image(self):
        assert mark_image('none', 48) is None

    def test_no_image_has_no_html(self):
        assert mark_html(None, 48) == ''

    def test_the_html_is_an_image_at_the_chosen_size(self):
        html = mark_html(mark_image('triad', 32), 32)

        assert html == '<img src="img://gui/maps/icons/otmetki/crosshair/otmetki/triad_64.png" width="32" height="32"/>'


class RetiredMarkTest(unittest.TestCase):

    def test_a_retired_mark_reads_as_the_nearest_new_one(self):
        assert normalize_mark('tint_brackets') == 'brackets'

    def test_every_retired_mark_maps_to_a_choice(self):
        for old, new in RETIRED_MARKS.items():
            assert new in MARKS, old

    def test_the_settings_keep_a_player_on_the_nearest_mark(self):
        assert Settings({'mark': 'aim_box'}, SCHEMA).get('mark') == 'corners'


class CentreMarkReticleTest(unittest.TestCase):

    def test_a_mark_hides_the_game_centre_of_its_reticles(self):
        assert native({'mark': 'cross', 'modes': 'sniper'}) == {'sniper': {'centralTag': 0}}

    def test_a_mark_keeps_the_game_centre_when_not_asked_to_hide_it(self):
        result = native({'mark': 'cross', 'preset': 'contrast', 'mark_hides_centre': False})

        assert result['arcade'] == PRESET_PARTS['contrast']

    def test_hiding_the_centre_overrides_the_preset(self):
        result = native({'mark': 'dot', 'preset': 'classic'})

        assert result['arcade']['centralTag'] == 0

    def test_the_mark_follows_the_reticle_plus_the_players_offset(self):
        settings = Settings({'x': 2, 'y': -3}, SCHEMA)

        assert mark_offset((960, 400), (1920, 1080), 1.0, settings) == (2, -143)

    def test_the_screen_centre_is_divided_by_the_interface_scale(self):
        assert mark_offset((640, 360), (1920, 1080), 1.5, Settings({}, SCHEMA)) == (0, 0)

    def test_both_modes_show_in_arcade(self):
        assert shows_in('both', True, False)

    def test_sniper_mode_shows_in_sniper(self):
        assert shows_in('sniper', False, True)

    def test_sniper_mode_hides_in_arcade(self):
        assert not shows_in('sniper', True, False)

    def test_nothing_shows_outside_arcade_and_sniper(self):
        assert not shows_in('both', False, False)


class CentreMarkSettingsTest(unittest.TestCase):

    def test_an_unknown_mark_falls_back_to_the_default(self):
        assert Settings({'mark': 'laser'}, SCHEMA).get('mark') == 'none'

    def test_the_default_keeps_the_games_own_centre(self):
        assert Settings(None, SCHEMA).get('mark') == 'none'

    def test_the_chevron_stays_a_choice_in_orange(self):
        assert 'chevron_thin' in SCHEMA.choices['mark']
        assert Settings({'mark': 'chevron_thin'}, SCHEMA).get('mark') == 'chevron_thin'
        assert Settings(None, SCHEMA).get('mark_color') == 'orange'

    def test_the_recommended_mark_has_its_outline(self):
        assert Settings(None, SCHEMA).get('mark_outline') is True

    def test_the_mark_size_is_capped(self):
        assert Settings({'mark_size': 999}, SCHEMA).get('mark_size') == 128

    def test_the_mark_is_centred_and_not_dragged(self):
        settings = Settings(None, SCHEMA)

        assert settings.get('drag') is False
        assert settings.get('align_x') == 'center'

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_every_mark_has_a_label(self):
        for mark in MARKS:
            assert 'crosshair_mark_' + mark in STRINGS['ru']

    def test_the_preview_is_the_mark_image(self):
        text = preview_text(Settings({'mark': 'triad'}, SCHEMA), None)

        assert text.startswith('<img src="img://')

    def test_the_preview_uses_the_chosen_colour_and_outline(self):
        settings = Settings({'mark': 'brackets', 'mark_color': 'red', 'mark_outline': True}, SCHEMA)

        assert 'brackets_o_red_64.png' in preview_text(settings, None)


class ReadoutsTest(unittest.TestCase):

    def test_a_reload_counts_down_in_tenths(self):
        readouts = Readouts()
        readouts.set_reload(3.21, 7.6)

        readouts.tick(1.0)

        assert readouts_data(readouts, Settings(None, SCHEMA), str)['reload']['value'] == '2.3'

    def test_the_last_second_is_final(self):
        readouts = Readouts()
        readouts.set_reload(0.8, 7.6)

        assert readouts.reload_state() == 'final'

    def test_a_finished_reload_shows_ready_for_a_moment(self):
        readouts = Readouts()
        readouts.set_reload(0.5, 7.6)

        readouts.tick(0.6)

        assert readouts.reload_state() == 'ready'

    def test_the_ready_mark_hides_after_its_hold(self):
        readouts = Readouts()
        readouts.set_reload(0.5, 7.6)
        readouts.tick(0.6)

        readouts.tick(1.5)

        assert readouts.reload_state() is None

    def test_a_reload_read_later_counts_from_now_not_from_its_update(self):
        assert reload_left(6.0, 1.5) == 1.5

    def test_no_shells_stays_no_shells_whatever_the_time_left(self):
        assert reload_left(-1, 0.0) == -1

    def test_a_finished_reload_stays_finished(self):
        assert reload_left(0.0, 0.0) == 0.0

    def test_a_snapshot_without_a_time_left_keeps_its_value(self):
        assert reload_left(6.0, None) == 6.0

    def test_no_shells_is_empty(self):
        readouts = Readouts()
        readouts.set_reload(-1, 7.6)

        assert readouts.reload_state() == 'empty'

    def test_a_single_shot_gun_has_no_magazine(self):
        assert Readouts().set_clip(1, 1) is False

    def test_a_magazine_shows_its_loaded_shells(self):
        data = readouts_data(sample_readouts(), Settings(None, SCHEMA), str)

        assert data['reload']['clip'] == {'size': 4, 'loaded': 3}

    def test_the_arcs_are_off_by_default(self):
        assert readouts_data(sample_readouts(), Settings(None, SCHEMA), str)['arcs'] is None

    def test_the_arcs_carry_the_reload_and_the_health(self):
        data = readouts_data(sample_readouts(), Settings({'reload_arcs': True}, SCHEMA), str)

        assert data['arcs'] == {'reload': 0.579, 'health': 0.65}

    def test_the_module_repairs_are_left_to_the_stock_damage_panel(self):
        data = readouts_data(sample_readouts(), Settings(None, SCHEMA), str)

        assert 'repairs' not in data

    def test_nothing_is_sent_with_every_readout_off(self):
        settings = Settings({'reload_box': False}, SCHEMA)

        assert readouts_data(sample_readouts(), settings, str) is None

    def test_nothing_is_read_with_every_readout_off(self):
        assert not wants_readouts(Settings({'reload_box': False}, SCHEMA))


class PreviewWidgetTest(unittest.TestCase):

    def test_a_vector_mark_goes_as_its_shape_and_colour(self):
        data = preview_widget(Settings({'mark': 'cross', 'mark_color': 'lime'}, SCHEMA), str)['data']

        assert (data['shape'], data['color'], data['mark']) == ('cross', '#b4f03c', None)

    def test_a_full_colour_mark_goes_as_its_image(self):
        data = preview_widget(Settings({'mark': 'triad', 'mark_size': 32}, SCHEMA), str)['data']

        assert data['mark'] == 'img://gui/maps/icons/otmetki/crosshair/otmetki/triad_64.png'

    def test_the_preview_draws_the_sample_readouts_over_the_sketch(self):
        data = preview_widget(Settings(None, SCHEMA), str)['data']

        assert data['sketch'] is True
        assert data['readouts']['reload']['value'] == '3.2'

    def test_the_battle_payload_draws_no_sketch(self):
        data = crosshair_widget(Settings(None, SCHEMA), str, None, sketch=False)['data']

        assert data['sketch'] is False
        assert data['readouts'] is None

    def test_no_mark_has_no_text_fallback(self):
        assert mark_text(Settings({'mark': 'none'}, SCHEMA)) == ''

    def test_the_preview_widget_matches_the_page_fixture(self):
        widget = preview_widget(Settings({'reload_arcs': True}, SCHEMA), _support.translator(STRINGS))

        assert _support.widget_fixture('crosshair', widget)


class EditorTest(unittest.TestCase):

    def test_the_groups_cover_every_field_once(self):
        keys = [key for _group, group_keys in EDITOR_GROUPS for key in group_keys]

        assert sorted(keys) == sorted(FIELD_KEYS)

    def test_the_groups_are_translated_in_order(self):
        described = editor(Settings(None, SCHEMA), lambda key: 'T:' + key)

        assert [group['id'] for group in described['groups']] == ['shape', 'colour', 'size', 'readouts', 'reticle']
        assert described['groups'][0] == {'id': 'shape', 'label': 'T:crosshair_group_shape', 'keys': ['mark']}

    def test_every_group_has_a_label_in_both_languages(self):
        for group, _keys in EDITOR_GROUPS:
            assert 'crosshair_group_' + group in STRINGS['ru']
            assert 'crosshair_group_' + group in STRINGS['en']

    def test_every_mark_has_a_shipped_thumbnail_in_the_chosen_colour(self):
        icons = editor(Settings({'mark_color': 'cyan'}, SCHEMA), str)['icons']['mark']
        shipped = shipped_images()

        assert sorted(icons) == sorted(MARK_FILES)
        assert icons['dot'] == 'img://gui/maps/icons/otmetki/crosshair/vector/dot_o_cyan_64.png'
        for value in icons.values():
            assert value[len('img://'):] in shipped

    def test_every_colour_has_a_swatch(self):
        swatches = editor(Settings(None, SCHEMA), str)['swatches']['mark_color']

        assert sorted(swatches) == sorted(MARK_COLORS)


class ReplacedReticlePartsTest(unittest.TestCase):

    def test_the_reload_box_replaces_the_stock_reload_timer(self):
        parts = replaced_reticle_parts(Settings(None, SCHEMA), Readouts())

        assert parts == (RETICLE_RELOAD_TIMER,)

    def test_the_magazine_cells_replace_the_stock_magazine_indicator(self):
        readouts = Readouts()
        readouts.set_clip(4, 3)

        parts = replaced_reticle_parts(Settings(None, SCHEMA), readouts)

        assert RETICLE_CASSETTE in parts

    def test_the_arcs_replace_the_stock_reload_and_hp_indicators(self):
        settings = Settings({'reload_box': False, 'reload_arcs': True}, SCHEMA)

        parts = replaced_reticle_parts(settings, Readouts())

        assert parts == (RETICLE_RELOAD, RETICLE_CONDITION)

    def test_nothing_is_replaced_while_the_readouts_are_not_drawn(self):
        assert replaced_reticle_parts(Settings(None, SCHEMA), None) == ()


if __name__ == '__main__':
    unittest.main()
