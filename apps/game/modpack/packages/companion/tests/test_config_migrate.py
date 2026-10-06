# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.companion.config import Config, user_set_tokens
from otmetki.companion.config.constants import (
    AIM_CIRCLE_PART_REVISION,
    AIM_CIRCLE_REVISION,
    DEFAULTS_REVISION,
    DROPPED_SECTIONS,
    LAYOUT_PLACES_SECTION,
    MERGED_SECTIONS,
    MIGRATION_REVISION,
    RETIRED_VALUES,
    SPLIT_KEYS,
    SPLIT_REVISION,
)
from otmetki.companion.config.migrate import migrated

CHAT_FILTER_DEFAULTS = {'timestamps': True, 'hide_repeats': True, 'x': 0}


def schema_defaults(section):
    return CHAT_FILTER_DEFAULTS if section == 'chat_filter' else None


def stored(**switches):
    return dict(switches, defaults_revision=2)


def migrate(config, components=None):
    return migrated(config, components or {}, schema_defaults)


def before_split(**switches):
    return dict(switches, defaults_revision=SPLIT_REVISION - 1)


def split_place(section, key):
    for (old_section, old_key), (new_section, new_key) in SPLIT_KEYS:
        if (old_section, old_key) == (section, key):
            return new_section, new_key
    return section, key


class MergedSwitchesTest(unittest.TestCase):

    def test_the_log_is_on_when_only_the_hit_log_was_on(self):
        config, _ = migrate(stored(battle_damage_log=False, battle_hit_log=True))

        self.assertTrue(config['battle_damage_log'])

    def test_the_progress_plate_is_on_when_the_main_gun_panel_was_on(self):
        config, _ = migrate(stored(battle_main_gun=True))

        self.assertTrue(config['battle_progress'])

    def test_the_personal_best_panel_alone_leaves_the_progress_plate_off(self):
        config, _ = migrate(stored(battle_personal_best=True))

        self.assertNotIn('battle_progress', config)

    def test_the_progress_plate_stays_off_when_none_of_its_panels_was_on(self):
        config, _ = migrate(stored(battle_main_gun=False, battle_efficiency=False, battle_personal_best=False))

        self.assertNotIn('battle_progress', config)

    def test_the_clock_switch_keeps_the_hangar_clock_on(self):
        config, _ = migrate(stored(hangar_info=False, battle_clock=True))

        self.assertTrue(config['hangar_info'])


class GuardTest(unittest.TestCase):

    def test_a_configured_chat_filter_is_recorded_as_the_players_choice(self):
        config, _ = migrate(stored(battle_chat_filter=True), {'chat_filter': {'timestamps': False, 'x': 0}})

        self.assertIn('battle_chat_filter', user_set_tokens(config['user_set']))

    def test_a_configured_chat_filter_stays_on_after_the_upgrade(self):
        config, _ = migrate(stored(battle_chat_filter=True), {'chat_filter': {'timestamps': False, 'x': 0}})

        self.assertTrue(Config(config).get('battle_chat_filter'))

    def test_a_chat_filter_moved_but_not_configured_is_turned_off(self):
        config, _ = migrate(stored(battle_chat_filter=True), {'chat_filter': {'timestamps': True, 'x': 40}})

        self.assertFalse(Config(config).get('battle_chat_filter'))

    def test_an_untouched_switch_takes_the_new_default(self):
        config, _ = migrate(stored(hangar_cleaner=True))

        self.assertFalse(Config(config).get('hangar_cleaner'))

    def test_a_switch_the_player_set_in_the_window_is_kept(self):
        config, _ = migrate(dict(stored(hangar_cleaner=True), user_set='hangar_cleaner'))

        self.assertTrue(Config(config).get('hangar_cleaner'))


class SectionsTest(unittest.TestCase):

    def test_the_sections_of_removed_components_go(self):
        components = {name: {'font_size': 14} for name in DROPPED_SECTIONS}

        _, migrated_components = migrate(stored(), components)

        self.assertEqual(migrated_components, {})

    def test_a_moved_value_the_player_changed_is_copied(self):
        for (old_section, old_key, old_default), (new_section, new_key) in MERGED_SECTIONS:
            changed = self.changed_value(old_default)

            _, components = migrate(stored(), {old_section: {old_key: changed}})

            section, key = split_place(new_section, new_key)
            self.assertEqual(components[section][key], changed)

    def test_a_moved_value_left_at_its_default_is_not_copied(self):
        for (old_section, old_key, old_default), (new_section, new_key) in MERGED_SECTIONS:
            _, components = migrate(stored(), {old_section: {old_key: old_default}})

            self.assertNotIn(new_key, components.get(new_section, {}))

    def test_a_value_left_at_its_old_default_takes_the_new_one(self):
        for _, section, key, old, new in RETIRED_VALUES:
            _, components = migrate(stored(), {section: {key: old}})

            self.assertEqual(components[section][key], new)

    def test_a_value_the_player_set_keeps_its_old_default(self):
        for _, section, key, old, _ in RETIRED_VALUES:
            config = dict(stored(), user_set='%s.%s' % (section, key))

            _, components = migrate(config, {section: {key: old}})

            self.assertEqual(components[section][key], old)

    def test_the_clock_strip_left_at_its_first_place_walks_to_the_top_left(self):
        old = {'x': -16, 'y': 76, 'align_x': 'right', 'align_y': 'top'}

        _, components = migrate(stored(), {'hangar_info': old})

        self.assertEqual(components['hangar_info'], {'x': 50, 'y': 83, 'align_x': 'left', 'align_y': 'top'})

    def test_the_clock_strip_left_above_the_carousel_moves_under_the_header(self):
        old = {'x': 0, 'y': -196, 'align_x': 'left', 'align_y': 'bottom'}

        _, components = migrate({'defaults_revision': MIGRATION_REVISION}, {'hangar_info': old})

        self.assertEqual(components['hangar_info'], {'x': 50, 'y': 83, 'align_x': 'left', 'align_y': 'top'})

    def test_a_crew_card_left_on_by_default_goes_off(self):
        config = {'defaults_revision': MIGRATION_REVISION}

        _, components = migrate(config, {'crew_xp': {'show_card': True}})

        self.assertFalse(components['crew_xp']['show_card'])

    def test_team_hp_left_at_the_bar_pair_becomes_a_bar_per_tank(self):
        config = {'defaults_revision': 7}

        _, components = migrate(config, {'team_hp': {'style': 'full'}})

        self.assertEqual(components['team_hp']['style'], 'icons')

    def test_minimap_names_left_to_the_game_start_at_always(self):
        config = {'defaults_revision': 7}

        _, components = migrate(config, {'minimap': {'vehicle_names': 'native'}})

        self.assertEqual(components['minimap']['vehicle_names'], 'always')

    def test_the_battle_log_loses_its_alt_view(self):
        stored = {'alt_mode': True, 'alt_entry_template': '#{index}', 'style': 'compact'}

        _, components = migrate({'defaults_revision': 7}, {'damage_log': stored})

        self.assertEqual(components['damage_log'], {'style': 'compact'})

    def test_minimap_names_the_player_left_to_the_game_stay(self):
        config = {'defaults_revision': 7, 'user_set': 'minimap.vehicle_names'}

        _, components = migrate(config, {'minimap': {'vehicle_names': 'native'}})

        self.assertEqual(components['minimap']['vehicle_names'], 'native')

    def test_a_zoom_readout_left_off_by_default_turns_on(self):
        config = {'defaults_revision': 4}

        _, components = migrate(config, {'crosshair': {'show_zoom': False}})

        self.assertTrue(components['crosshair']['show_zoom'])

    def test_a_clock_strip_the_player_moved_stays(self):
        moved = {'x': 40, 'y': 76, 'align_x': 'right', 'align_y': 'top'}

        _, components = migrate(stored(), {'hangar_info': moved})

        self.assertEqual(components['hangar_info'], moved)

    def test_a_file_at_revision_three_keeps_its_merge_but_loses_the_battle_summary_card(self):
        config = {'defaults_revision': MIGRATION_REVISION, 'battle_hit_log': True, 'battle_damage_log': False}
        places = {'comp7': {'battle_summary': {'x': 1}, 'damage_log': {'x': 2}}}
        components = {'battle_summary': {'x': -372}, LAYOUT_PLACES_SECTION: places}

        migrated_config, migrated_components = migrate(config, components)

        self.assertFalse(migrated_config['battle_damage_log'])
        self.assertEqual(migrated_components, {LAYOUT_PLACES_SECTION: {'comp7': {'damage_log': {'x': 2}}}})

    def test_a_file_at_revision_three_loses_the_settings_backup_section(self):
        config = {'defaults_revision': MIGRATION_REVISION, 'config_backup': True}

        _, components = migrate(config, {'config_backup': {}, 'damage_log': {'x': 2}})

        self.assertEqual(components, {'damage_log': {'x': 2}})

    def test_a_file_at_revision_three_loses_the_removed_options_of_the_components_that_stay(self):
        config = {'defaults_revision': MIGRATION_REVISION}
        components = {'crosshair': {'repair_timers': True, 'reload_box': True}, 'update_notice': {'show_card': True}}

        _, migrated_components = migrate(config, components)

        self.assertEqual(migrated_components, {'crosshair': {'reload_box': True}, 'update_notice': {}})

    def test_a_file_at_revision_three_loses_the_armour_readout_and_the_place_of_the_aim_panel(self):
        config = {'defaults_revision': MIGRATION_REVISION}
        aim = {
            'x': 0, 'y': 132, 'align_x': 'center', 'align_y': 'center', 'alpha': 100, 'drag': True, 'scale': 100,
            'armor_under_aim': True, 'show_nominal': True, 'show_piercing': True, 'show_angle': False,
            'placement': 'reticle', 'target_distance': False, 'shell_tooltips': True,
        }

        _, components = migrate(config, {'aim_info': aim})

        self.assertEqual(components['aim_info'], {'target_distance': False, 'shell_tooltips': True})

    def test_an_aim_circle_that_was_on_in_aim_info_turns_on_its_component(self):
        config = {'defaults_revision': AIM_CIRCLE_REVISION - 1}
        aim = {'aim_circle': True, 'aim_circle_scale': 70}

        migrated_config, _ = migrate(config, {'aim_info': aim, 'crosshair': {'mark': 'dot'}})

        self.assertIs(migrated_config['battle_aim_circle'], True)

    def test_an_aim_circle_that_was_on_in_aim_info_keeps_its_size(self):
        config = {'defaults_revision': AIM_CIRCLE_REVISION - 1}
        aim = {'aim_circle': True, 'aim_circle_scale': 70}

        _, components = migrate(config, {'aim_info': aim, 'crosshair': {'mark': 'dot'}})

        self.assertEqual(components['aim_circle'], {'size': 'p70'})

    def test_the_aim_circle_takes_the_nearest_smaller_share(self):
        config = {'defaults_revision': AIM_CIRCLE_REVISION - 1}

        _, components = migrate(config, {'aim_info': {'aim_circle': True, 'aim_circle_scale': 50}})

        self.assertEqual(components['aim_circle'], {'size': 'p60'})

    def test_an_aim_circle_at_its_default_share_moves_as_seventy(self):
        config = {'defaults_revision': AIM_CIRCLE_REVISION - 1}

        _, components = migrate(config, {'aim_info': {'aim_circle': True}})

        self.assertEqual(components['aim_circle'], {'size': 'p70'})

    def test_an_aim_circle_that_was_off_leaves_the_crosshair_alone(self):
        config = {'defaults_revision': AIM_CIRCLE_REVISION - 1}

        _, components = migrate(config, {'aim_info': {'aim_circle': False, 'aim_circle_scale': 60}})

        self.assertNotIn('crosshair', components)

    def test_the_aim_circle_keys_leave_aim_info(self):
        config = {'defaults_revision': AIM_CIRCLE_REVISION - 1}
        aim = {'target_distance': True, 'aim_circle': True, 'aim_circle_scale': 80}

        _, components = migrate(config, {'aim_info': aim})

        self.assertEqual(components['aim_info'], {'target_distance': True})

    def test_a_smaller_crosshair_circle_turns_on_its_component(self):
        config = {'defaults_revision': AIM_CIRCLE_PART_REVISION - 1}

        migrated_config, _ = migrate(config, {'crosshair': {'aim_circle': 'p80'}})

        self.assertIs(migrated_config['battle_aim_circle'], True)

    def test_a_smaller_crosshair_circle_keeps_its_size(self):
        config = {'defaults_revision': AIM_CIRCLE_PART_REVISION - 1}

        _, components = migrate(config, {'crosshair': {'aim_circle': 'p80'}})

        self.assertEqual(components['aim_circle'], {'size': 'p80'})

    def test_the_circle_key_leaves_the_crosshair(self):
        config = {'defaults_revision': AIM_CIRCLE_PART_REVISION - 1}

        _, components = migrate(config, {'crosshair': {'aim_circle': 'p60', 'mark': 'dot'}})

        self.assertEqual(components['crosshair'], {'mark': 'dot'})

    def test_a_crosshair_circle_at_the_game_size_leaves_the_switch_off(self):
        config = {'defaults_revision': AIM_CIRCLE_PART_REVISION - 1}

        migrated_config, _ = migrate(config, {'crosshair': {'aim_circle': 'stock'}})

        self.assertNotIn('battle_aim_circle', migrated_config)

    def test_a_crosshair_circle_at_the_game_size_adds_no_section(self):
        config = {'defaults_revision': AIM_CIRCLE_PART_REVISION - 1}

        _, components = migrate(config, {'crosshair': {'aim_circle': 'stock'}})

        self.assertNotIn('aim_circle', components)

    def test_a_file_at_revision_three_loses_the_battle_type_places_of_the_aim_panel(self):
        config = {'defaults_revision': MIGRATION_REVISION}
        places = {'comp7': {'aim_info': {'x': 1}, 'damage_log': {'x': 2}}}

        _, components = migrate(config, {LAYOUT_PLACES_SECTION: places})

        self.assertEqual(components[LAYOUT_PLACES_SECTION], {'comp7': {'damage_log': {'x': 2}}})

    def test_a_file_at_the_revision_keeps_what_it_holds(self):
        config = {'defaults_revision': DEFAULTS_REVISION}
        components = {'crosshair': {'repair_timers': True}}

        _, migrated_components = migrate(config, components)

        self.assertEqual(migrated_components, components)

    def test_a_crosshair_left_at_the_chevron_takes_the_stock_centre(self):
        config = {'defaults_revision': MIGRATION_REVISION}

        _, components = migrate(config, {'crosshair': {'mark': 'chevron_thin', 'mark_size': 32}})

        self.assertEqual(components['crosshair'], {'mark': 'none', 'mark_size': 32})

    def test_a_chevron_the_player_picked_stays(self):
        config = {'defaults_revision': MIGRATION_REVISION, 'user_set': 'crosshair.mark'}

        _, components = migrate(config, {'crosshair': {'mark': 'chevron_thin'}})

        self.assertEqual(components['crosshair']['mark'], 'chevron_thin')

    def test_a_revision_three_value_does_not_move_again_in_a_revision_three_file(self):
        config = {'defaults_revision': MIGRATION_REVISION}

        _, components = migrate(config, {'marks_panel': {'style': 'extended'}})

        self.assertEqual(components['marks_panel']['style'], 'extended')

    def test_the_battle_type_places_of_removed_panels_go(self):
        places = {'comp7': {name: {'x': 1} for name in DROPPED_SECTIONS}}

        _, components = migrate(stored(), {LAYOUT_PLACES_SECTION: places})

        self.assertEqual(components[LAYOUT_PLACES_SECTION], {'comp7': {}})

    @staticmethod
    def changed_value(default):
        if isinstance(default, bool):
            return not default
        if isinstance(default, int):
            return default + 1
        return '%s!' % default


class SwitchedPartsTest(unittest.TestCase):

    def test_a_goals_card_the_player_switched_off_stays_off_in_the_session_card(self):
        _, components = migrate(stored(hangar_session_goals=False))

        self.assertFalse(components['session_stats']['show_goals'])

    def test_the_progress_rows_follow_the_panels_the_player_had_on(self):
        _, components = migrate(stored(battle_main_gun=True, battle_efficiency=False))

        self.assertEqual(components['battle_progress'], {'row_main_gun': True, 'row_wn8': False})

    def test_the_progress_rows_keep_their_defaults_when_no_panel_was_on(self):
        _, components = migrate(stored(battle_main_gun=False))

        self.assertNotIn('battle_progress', components)


class MarksSplitTest(unittest.TestCase):

    def test_both_marks_parts_stay_on_for_a_player_who_had_them_on(self):
        config, _ = migrate(before_split(battle_moe_panel=True), {'marks_panel': {'style': 'compact'}})

        self.assertEqual((config['battle_moe_panel'], config['hangar_tank_card']), (True, True))

    def test_the_battle_panel_switched_off_inside_the_marks_stays_off(self):
        config, _ = migrate(before_split(battle_moe_panel=True), {'marks_panel': {'show_battle_panel': False}})

        self.assertFalse(config['battle_moe_panel'])

    def test_the_card_stays_on_when_only_the_battle_panel_was_off(self):
        config, _ = migrate(before_split(battle_moe_panel=True), {'marks_panel': {'show_battle_panel': False}})

        self.assertTrue(config['hangar_tank_card'])

    def test_the_card_switched_off_inside_the_marks_stays_off(self):
        config, _ = migrate(before_split(battle_moe_panel=True), {'marks_panel': {'hangar_card': False}})

        self.assertFalse(config['hangar_tank_card'])

    def test_the_marks_switched_off_keep_both_parts_off(self):
        config, _ = migrate(before_split(battle_moe_panel=False))

        self.assertEqual((config['battle_moe_panel'], config['hangar_tank_card']), (False, False))

    def test_a_part_left_off_is_recorded_as_the_players_choice(self):
        config, _ = migrate(before_split(battle_moe_panel=True), {'marks_panel': {'hangar_card': False}})

        self.assertIn('hangar_tank_card', user_set_tokens(config['user_set']))

    def test_a_part_left_on_is_not_recorded(self):
        config, _ = migrate(before_split(battle_moe_panel=True))

        self.assertNotIn('hangar_tank_card', user_set_tokens(config['user_set']))

    def test_the_card_options_move_to_the_card_section(self):
        stored_marks = {
            'hangar_style': 'extended',
            'show_trend': False,
            'trend_battles': 12,
            'show_tank_ratings': False,
            'show_mastery': False,
            'show_research': False,
            'carousel_percent': True,
        }

        _, components = migrate(before_split(), {'marks_panel': stored_marks, 'hangar_marks': {'x': 40}})

        self.assertEqual(components['hangar_marks'], {
            'x': 40,
            'style': 'extended',
            'show_trend': False,
            'trend_battles': 12,
            'show_tank_ratings': False,
            'show_mastery': False,
            'show_research': False,
            'carousel_percent': True,
        })

    def test_the_alt_detail_joins_the_card_and_leaves_the_battle_panel(self):
        _, components = migrate(before_split(), {'marks_panel': {'alt_detail': False, 'style': 'minimal'}})

        self.assertEqual(components['marks_panel'], {'style': 'minimal'})
        self.assertFalse(components['hangar_marks']['alt_detail'])

    def test_a_split_file_loses_the_battle_alt_detail_and_keeps_the_cards(self):
        components = {'marks_panel': {'alt_detail': False, 'bar': 'percent'}, 'hangar_marks': {'alt_detail': False}}

        _, migrated_components = migrate({'defaults_revision': SPLIT_REVISION}, components)

        expected = {'marks_panel': {'bar': 'percent'}, 'hangar_marks': {'alt_detail': False}}
        self.assertEqual(migrated_components, expected)

    def test_the_battle_panel_keeps_only_its_own_options(self):
        stored_marks = {
            'style': 'extended',
            'color_mode': 'mark',
            'show_battle_panel': True,
            'hangar_card': True,
            'hangar_style': 'compact',
            'show_trend': True,
            'trend_battles': 5,
            'show_tank_ratings': True,
            'show_mastery': True,
            'show_research': True,
            'carousel_percent': False,
            'show_battles': True,
        }

        _, components = migrate(before_split(), {'marks_panel': stored_marks})

        self.assertEqual(components['marks_panel'], {'style': 'extended', 'color_mode': 'mark'})

    def test_a_card_option_the_file_does_not_hold_stays_at_the_card_default(self):
        _, components = migrate(before_split(), {'marks_panel': {'show_trend': False}, 'hangar_marks': {'style': 'x'}})

        self.assertNotIn('style', components['hangar_marks'])

    def test_no_card_section_is_written_without_card_options(self):
        _, components = migrate(before_split(), {'damage_log': {'x': 1}})

        self.assertNotIn('hangar_marks', components)

    def test_an_older_file_carries_the_hangar_marks_style_to_the_card(self):
        _, components = migrate(stored(hangar_marks=True), {'hangar_marks': {'style': 'compact', 'x': 16}})

        self.assertEqual(components['hangar_marks'], {'style': 'compact', 'x': 16})

    def test_an_older_file_switched_off_the_marks_panel_but_kept_the_card(self):
        config, _ = migrate(stored(battle_moe_panel=False, hangar_marks=True))

        self.assertEqual((config['battle_moe_panel'], config['hangar_tank_card']), (False, True))

    def test_a_file_at_the_revision_keeps_both_switches(self):
        config = {'defaults_revision': DEFAULTS_REVISION, 'battle_moe_panel': True, 'hangar_tank_card': False}

        migrated_config, _ = migrate(config, {'marks_panel': {'hangar_card': True}})

        self.assertFalse(migrated_config['hangar_tank_card'])


class ScopeTest(unittest.TestCase):

    def test_a_fresh_install_is_left_alone(self):
        config, components = migrate({}, {'hit_log': {'x': 1}})

        self.assertEqual((config, components), ({}, {'hit_log': {'x': 1}}))

    def test_a_file_at_the_current_revision_is_left_alone(self):
        components = {'battle_summary': {'x': 1}, 'crosshair': {'mark': 'chevron_thin'}}

        _, migrated_components = migrate({'defaults_revision': DEFAULTS_REVISION}, components)

        self.assertEqual(migrated_components, components)

    def test_a_file_at_the_revision_is_left_alone(self):
        config = {'defaults_revision': MIGRATION_REVISION, 'battle_hit_log': True, 'battle_damage_log': False}

        migrated_config, _ = migrate(config)

        self.assertFalse(migrated_config['battle_damage_log'])


if __name__ == '__main__':
    unittest.main()
