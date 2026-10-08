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
    hidden_centre,
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
from otmetki.core.hud.stock import (
    RETICLE_CENTRE,
    RETICLE_CASSETTE,
    RETICLE_CONDITION,
    RETICLE_RELOAD,
    RETICLE_RELOAD_TIMER,
    RETICLE_ZOOM,
)
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
    'drum_style',
    'reload_arcs',
    'show_zoom',
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

    def test_a_picked_mark_leaves_the_saved_game_centre_alone(self):
        result = to_native(Settings({'mark': 'chevron_thin'}, SCHEMA).to_dict())

        assert result['arcade'] == PRESET_PARTS['minimal']

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

    def test_a_mark_writes_no_game_centre_into_the_saved_options(self):
        assert native({'mark': 'cross', 'modes': 'sniper'}) == {}

    def test_a_drawn_mark_hides_the_game_centre_for_the_battle(self):
        assert hidden_centre(Settings({'mark': 'cross'}, SCHEMA), True) == (RETICLE_CENTRE,)

    def test_the_game_centre_stays_where_the_mark_is_not_drawn(self):
        assert hidden_centre(Settings({'mark': 'cross'}, SCHEMA), False) == ()

    def test_the_game_centre_stays_when_not_asked_to_hide_it(self):
        assert hidden_centre(Settings({'mark': 'cross', 'mark_hides_centre': False}, SCHEMA), True) == ()

    def test_a_mark_keeps_the_game_centre_when_not_asked_to_hide_it(self):
        result = native({'mark': 'cross', 'preset': 'contrast', 'mark_hides_centre': False})

        assert result['arcade'] == PRESET_PARTS['contrast']

    def test_the_preset_keeps_its_own_centre_under_a_mark(self):
        result = native({'mark': 'dot', 'preset': 'classic'})

        assert result['arcade'] == PRESET_PARTS['classic']

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


def clip_readouts(loaded):
    readouts = Readouts()
    readouts.set_clip(4, loaded)
    readouts.set_interval(1.5)
    readouts.set_drum_reload(24.0)
    return readouts


def reload_box(readouts):
    data = readouts_data(readouts, Settings(None, SCHEMA), str)['reload']
    return data['value'], data['full'], data['state']


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

    def test_after_the_ready_mark_the_box_shows_the_full_reload_time(self):
        readouts = Readouts()
        readouts.set_reload(0.5, 7.6)
        readouts.tick(0.6)

        readouts.tick(1.5)

        assert readouts.reload_state() == 'loaded'
        assert readouts_data(readouts, Settings(None, SCHEMA), str)['reload']['value'] == '7.6'

    def test_a_gun_loaded_at_the_start_shows_its_full_reload_time(self):
        readouts = Readouts()
        readouts.set_reload(0.0, 9.4)

        assert readouts_data(readouts, Settings(None, SCHEMA), str)['reload']['value'] == '9.4'

    def test_a_loaded_gun_with_an_unknown_reload_time_draws_no_box(self):
        readouts = Readouts()
        readouts.set_reload(0.0, None)

        assert readouts_data(readouts, Settings(None, SCHEMA), str) is None

    def test_nothing_is_drawn_before_the_client_told_the_reload(self):
        assert readouts_data(Readouts(), Settings(None, SCHEMA), str) is None

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

    def test_a_magazine_shows_its_loaded_shells_as_shell_icons_by_default(self):
        data = readouts_data(sample_readouts(), Settings(None, SCHEMA), str)

        assert data['reload']['clip'] == {
            'style': 'shells',
            'size': 6,
            'loaded': 4,
            'shell': 'apcr',
            'gold': False,
            'refill': None,
        }

    def test_the_magazine_can_be_drawn_as_bars(self):
        data = readouts_data(sample_readouts(), Settings({'drum_style': 'bars'}, SCHEMA), str)

        assert data['reload']['clip']['style'] == 'bars'

    def test_the_magazine_can_be_left_to_the_stock_reticle(self):
        data = readouts_data(sample_readouts(), Settings({'drum_style': 'off'}, SCHEMA), str)

        assert data['reload']['clip'] is None

    def test_an_unknown_loaded_count_keeps_the_last_magazine(self):
        readouts = Readouts()
        readouts.set_clip(6, 4, 'apcr', False)

        changed = readouts.set_clip(6, -1)

        assert changed is False
        assert readouts.clip == (6, 4)

    def test_an_unknown_loaded_count_keeps_the_last_shell(self):
        readouts = Readouts()
        readouts.set_clip(6, 4, 'apcr', False)

        readouts.set_clip(6, None)

        assert readouts.shell == 'apcr'

    def test_an_unknown_loaded_count_of_another_magazine_clears_it(self):
        readouts = Readouts()
        readouts.set_clip(6, 4)

        readouts.set_clip(3, -1)

        assert readouts.clip is None

    def test_a_gun_without_a_magazine_clears_it(self):
        readouts = Readouts()
        readouts.set_clip(6, 4)

        readouts.set_clip(1, 1)

        assert readouts.clip is None

    def test_an_auto_reloader_draws_its_magazine_even_when_left_to_the_stock_reticle(self):
        readouts = sample_readouts()
        readouts.set_autoloader(True)

        data = readouts_data(readouts, Settings({'drum_style': 'off'}, SCHEMA), str)

        assert data['reload']['clip']['style'] == 'shells'

    def test_a_large_drum_keeps_its_real_size(self):
        readouts = Readouts()
        readouts.set_clip(30, 17)

        assert readouts.clip == (30, 17)

    def test_an_unknown_shell_kind_draws_the_plain_shell(self):
        readouts = Readouts()
        readouts.set_clip(3, 3, 'smoke', False)
        readouts.set_reload(0.0, 2.0)

        assert readouts_data(readouts, Settings(None, SCHEMA), str)['reload']['clip']['shell'] is None

    def test_a_drum_shows_its_full_reload_under_the_next_shell_timer(self):
        data = readouts_data(sample_readouts(), Settings(None, SCHEMA), str)

        assert (data['reload']['value'], data['reload']['full']) == ('1.8', '24.6')

    def test_a_full_drum_does_not_write_its_reload_time_twice(self):
        readouts = Readouts()
        readouts.set_clip(4, 4)
        readouts.set_drum_reload(24.6)
        readouts.set_reload(0.0, 24.6)

        assert readouts_data(readouts, Settings(None, SCHEMA), str)['reload']['full'] is None

    def test_an_auto_reloader_fills_the_next_shell_while_the_drum_is_not_full(self):
        readouts = Readouts()
        readouts.set_clip(4, 2)
        readouts.set_reload(0.0, 2.0)
        readouts.set_auto_reload(6.0, 8.0)

        readouts.tick(1.0)

        refill = readouts_data(readouts, Settings(None, SCHEMA), str)['reload']['clip']['refill']
        assert refill == {'value': '5.0', 'progress': 0.375}

    def test_an_auto_reloader_keeps_counting_after_the_gun_is_loaded(self):
        readouts = Readouts()
        readouts.set_clip(4, 2)
        readouts.set_auto_reload(6.0, 8.0)

        assert readouts.tick(0.1) is True

    def test_a_full_drum_has_nothing_to_refill(self):
        readouts = Readouts()
        readouts.set_clip(4, 4)
        readouts.set_reload(0.0, 2.0)
        readouts.set_auto_reload(6.0, 8.0)

        assert readouts_data(readouts, Settings(None, SCHEMA), str)['reload']['clip']['refill'] is None

    def test_a_full_clip_at_the_start_shows_the_interval_and_the_clip_reload(self):
        readouts = clip_readouts(loaded=4)
        readouts.set_reload(0.0, 24.0)

        assert reload_box(readouts) == ('1.5', '24.0', 'loaded')
        assert readouts.is_counting() is False

    def test_a_loaded_clip_stays_put(self):
        readouts = clip_readouts(loaded=4)
        readouts.set_reload(0.0, 1.5)

        readouts.tick(5.0)

        assert reload_box(readouts) == ('1.5', '24.0', 'loaded')

    def test_a_shot_with_shells_left_counts_the_interval(self):
        readouts = clip_readouts(loaded=3)
        readouts.set_reload(1.5, 1.5)

        readouts.tick(0.4)

        assert reload_box(readouts) == ('1.1', '24.0', 'reloading')
        assert readouts.reload_progress() == round(0.4 / 1.5, 3)

    def test_the_last_shell_loaded_shows_the_clip_reload_once(self):
        readouts = clip_readouts(loaded=1)
        readouts.set_reload(0.0, 24.0)

        assert reload_box(readouts) == ('24.0', None, 'loaded')

    def test_an_empty_clip_counts_the_clip_reload(self):
        readouts = clip_readouts(loaded=0)
        readouts.set_reload(24.0, 24.0)

        readouts.tick(6.0)

        assert reload_box(readouts)[0] == '18.0'
        assert readouts.reload_progress() == 0.25

    def test_a_clip_reload_cut_to_the_interval_still_counts_the_whole_clip(self):
        readouts = clip_readouts(loaded=0)
        readouts.set_reload(24.0, 1.5)

        readouts.tick(6.0)

        assert readouts.reload_progress() == 0.25

    def test_a_burst_gun_shows_the_clip_reload_before_its_last_burst(self):
        readouts = clip_readouts(loaded=2)
        readouts.set_interval(1.5, 2)
        readouts.set_reload(0.0, 1.5)

        assert reload_box(readouts)[0] == '24.0'

    def test_an_auto_reloader_shows_the_interval_down_to_its_last_shell(self):
        readouts = clip_readouts(loaded=1)
        readouts.set_autoloader(True)
        readouts.set_reload(0.0, 6.0)

        assert reload_box(readouts)[0] == '1.5'

    def test_an_auto_reloader_shows_the_refilling_shells_time_under_the_value(self):
        readouts = clip_readouts(loaded=2)
        readouts.set_autoloader(True)
        readouts.set_reload(0.0, 1.5)
        readouts.set_auto_reload(6.0, 8.0)

        readouts.tick(1.0)

        data = readouts_data(readouts, Settings(None, SCHEMA), str)['reload']
        assert (data['value'], data['full'], data['clip']['refill']['value']) == ('1.5', '8.0', '5.0')

    def test_an_empty_auto_reloader_counts_the_refill_only_in_the_box(self):
        readouts = clip_readouts(loaded=0)
        readouts.set_autoloader(True)
        readouts.set_reload(16.0, 24.0)
        readouts.set_auto_reload(16.0, 24.0)

        refill = readouts_data(readouts, Settings(None, SCHEMA), str)['reload']['clip']['refill']

        assert refill['value'] is None

    def test_a_single_shot_gun_ignores_a_clip_interval(self):
        readouts = Readouts()
        readouts.set_clip(1, 1)
        readouts.set_interval(1.5)
        readouts.set_reload(0.0, 9.4)

        assert reload_box(readouts) == ('9.4', None, 'loaded')

    def test_the_zoom_is_on_by_default(self):
        assert readouts_data(sample_readouts(), Settings(None, SCHEMA), str)['zoom'] == '8.0'

    def test_the_zoom_shows_the_sniper_multiplier(self):
        data = readouts_data(sample_readouts(), Settings({'show_zoom': True}, SCHEMA), str)

        assert data['zoom'] == '8.0'

    def test_no_zoom_outside_the_sniper_view(self):
        readouts = sample_readouts()
        readouts.set_zoom(None)

        assert readouts_data(readouts, Settings({'show_zoom': True}, SCHEMA), str)['zoom'] is None

    def test_the_zoom_alone_is_drawn_and_read(self):
        settings = Settings({'reload_box': False, 'drum_style': 'off', 'show_zoom': True}, SCHEMA)

        assert wants_readouts(settings)
        assert readouts_data(sample_readouts(), settings, str) == {'reload': None, 'arcs': None, 'zoom': '8.0'}

    def test_the_arcs_are_off_by_default(self):
        assert readouts_data(sample_readouts(), Settings(None, SCHEMA), str)['arcs'] is None

    def test_the_arcs_carry_the_reload_and_the_health(self):
        data = readouts_data(sample_readouts(), Settings({'reload_arcs': True}, SCHEMA), str)

        assert data['arcs'] == {'reload': 0.28, 'health': 0.65}

    def test_the_module_repairs_are_left_to_the_stock_damage_panel(self):
        data = readouts_data(sample_readouts(), Settings(None, SCHEMA), str)

        assert 'repairs' not in data

    def test_nothing_is_sent_with_every_readout_off(self):
        settings = Settings({'reload_box': False, 'drum_style': 'off', 'show_zoom': False}, SCHEMA)

        assert readouts_data(sample_readouts(), settings, str) is None

    def test_nothing_is_read_with_every_readout_off(self):
        assert not wants_readouts(Settings({'reload_box': False, 'drum_style': 'off', 'show_zoom': False}, SCHEMA))

    def test_the_drum_stays_with_the_reload_timer_off(self):
        settings = Settings({'reload_box': False, 'show_zoom': False}, SCHEMA)

        reload_box = readouts_data(sample_readouts(), settings, str)['reload']

        assert reload_box['clip'] is not None

    def test_the_reload_timer_off_draws_no_timer(self):
        settings = Settings({'reload_box': False, 'show_zoom': False}, SCHEMA)

        reload_box = readouts_data(sample_readouts(), settings, str)['reload']

        assert reload_box['timer'] is False

    def test_the_drum_alone_keeps_the_stock_reload_timer(self):
        drawn = readouts_data(sample_readouts(), Settings({'reload_box': False, 'show_zoom': False}, SCHEMA), str)

        assert replaced_reticle_parts(drawn) == (RETICLE_CASSETTE,)


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
        assert data['readouts']['reload']['value'] == '1.8'

    def test_the_battle_payload_draws_no_sketch(self):
        data = crosshair_widget(Settings(None, SCHEMA), str, None, sketch=False)['data']

        assert data['sketch'] is False
        assert data['readouts'] is None

    def test_no_mark_has_no_text_fallback(self):
        assert mark_text(Settings({'mark': 'none'}, SCHEMA)) == ''

    def test_the_preview_widget_matches_the_page_fixture(self):
        settings = Settings({'reload_arcs': True, 'show_zoom': True}, SCHEMA)

        widget = preview_widget(settings, _support.translator(STRINGS))

        assert _support.widget_fixture('crosshair', widget)


class EditorTest(unittest.TestCase):

    def test_the_groups_cover_every_field_once(self):
        keys = [key for _group, group_keys in EDITOR_GROUPS for key in group_keys]

        assert sorted(keys) == sorted(FIELD_KEYS)

    def test_the_groups_are_translated_in_order(self):
        described = editor(Settings(None, SCHEMA), lambda key: 'T:' + key)

        assert [group['id'] for group in described['groups']] == ['shape', 'colour', 'size', 'readouts', 'reticle']
        assert described['groups'][3]['keys'] == ['reload_box', 'drum_style', 'reload_arcs', 'show_zoom']
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

    def drawn(self, readouts, **values):
        return readouts_data(readouts, Settings(values or None, SCHEMA), str)

    def test_the_drawn_reload_box_replaces_the_stock_reload_timer(self):
        assert replaced_reticle_parts(self.drawn(sample_readouts(), reload_box=True, show_zoom=False)) == (
            RETICLE_RELOAD_TIMER,
            RETICLE_CASSETTE,
        )

    def test_a_box_without_magazine_cells_keeps_the_stock_magazine_indicator(self):
        readouts = Readouts()
        readouts.set_reload(3.0, 7.6)

        assert replaced_reticle_parts(self.drawn(readouts)) == (RETICLE_RELOAD_TIMER,)

    def test_the_stock_reload_timer_stays_while_the_client_has_not_told_the_reload(self):
        assert replaced_reticle_parts(self.drawn(Readouts())) == ()

    def test_the_stock_reload_timer_stays_while_the_box_has_nothing_to_show(self):
        readouts = Readouts()
        readouts.set_reload(0.0, None)

        assert replaced_reticle_parts(self.drawn(readouts)) == ()

    def test_the_drawn_arcs_replace_the_stock_reload_and_hp_indicators(self):
        drawn = self.drawn(sample_readouts(), reload_box=False, drum_style='off', reload_arcs=True, show_zoom=False)

        assert replaced_reticle_parts(drawn) == (RETICLE_RELOAD, RETICLE_CONDITION)

    def test_a_box_without_its_drum_keeps_the_stock_magazine_indicator(self):
        drawn = self.drawn(sample_readouts(), drum_style='off', show_zoom=False)

        assert replaced_reticle_parts(drawn) == (RETICLE_RELOAD_TIMER,)

    def test_the_drawn_zoom_replaces_the_stock_zoom_indicator(self):
        drawn = self.drawn(sample_readouts(), reload_box=False, drum_style='off', show_zoom=True)

        assert replaced_reticle_parts(drawn) == (RETICLE_ZOOM,)

    def test_an_arc_without_a_value_keeps_its_stock_indicator(self):
        readouts = Readouts()
        readouts.set_health(500, 1000)

        drawn = self.drawn(readouts, reload_box=False, reload_arcs=True)

        assert replaced_reticle_parts(drawn) == (RETICLE_CONDITION,)

    def test_nothing_is_replaced_while_the_readouts_are_not_drawn(self):
        assert replaced_reticle_parts(None) == ()


if __name__ == '__main__':
    unittest.main()
