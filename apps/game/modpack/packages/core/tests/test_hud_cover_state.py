# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.hud.cover import CoverState, PageOverlays, flash_visible, window_reason
from otmetki.core.hud.layer.constants import COVER_FULL_STATS, COVER_GUI, COVER_LOADING, COVER_SCREEN

WINDOW = 1
DIALOG = 17
POP_OVER = 33
TOOLTIP = 49
MAIN_WINDOW = 6
FULLSCREEN = 1024
WINDOW_MODAL = 4096


class CoverStateTest(unittest.TestCase):

    def test_a_reason_stays_while_another_source_still_reports_it(self):
        state = CoverState()
        state.report('loading', (COVER_LOADING,))
        state.report('page', (COVER_LOADING,))

        state.report('loading', ())

        assert state.reasons() == frozenset((COVER_LOADING,))

    def test_the_reason_goes_with_the_last_source_that_reported_it(self):
        state = CoverState()
        state.report('page', (COVER_SCREEN,))
        state.report('windows', (COVER_SCREEN,))
        state.report('page', ())

        state.report('windows', ())

        assert state.reasons() == frozenset()

    def test_a_report_replaces_what_the_source_said_before(self):
        state = CoverState()
        state.report('page', (COVER_FULL_STATS,))

        state.report('page', (COVER_SCREEN,))

        assert state.reasons() == frozenset((COVER_SCREEN,))

    def test_the_same_report_again_changes_nothing(self):
        state = CoverState()
        state.report('page', (COVER_FULL_STATS,))

        assert not state.report('page', (COVER_FULL_STATS,))

    def test_an_unknown_reason_is_left_out(self):
        state = CoverState()

        state.report('page', ('chat',))

        assert not state.covered

    def test_the_window_switch_off_leaves_only_v_the_killer_camera_and_the_loading_screen(self):
        state = CoverState()
        state.report('gui', (COVER_GUI,))
        state.report('page', (COVER_FULL_STATS,))
        state.report('windows', (COVER_SCREEN,))

        reasons = state.reasons(windows=False)

        assert reasons == frozenset((COVER_GUI,))

    def test_a_reset_keeps_only_the_sources_asked_for(self):
        state = CoverState()
        state.report('loading', (COVER_LOADING,))
        state.report('page', (COVER_FULL_STATS,))

        state.reset(keep=('loading',))

        assert state.reasons() == frozenset((COVER_LOADING,))


class PageOverlaysTest(unittest.TestCase):

    def test_the_page_hiding_its_reference_component_covers_the_battle(self):
        overlays = PageOverlays('fullStats')

        overlays.changed(visible={'questProgressTopView'}, hidden={'teamBasesPanel', 'damagePanel'})

        assert overlays.reasons() == frozenset((COVER_FULL_STATS,))

    def test_the_reference_shown_again_uncovers_the_battle(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(hidden={'teamBasesPanel'})

        overlays.changed(visible={'teamBasesPanel', 'damagePanel'})

        assert overlays.reasons() == frozenset()

    def test_a_lower_reference_counts_only_on_a_page_without_the_first(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(visible={'teamBasesPanel'})

        overlays.changed(hidden={'minimap'})

        assert overlays.reasons() == frozenset()

    def test_a_page_without_team_bases_follows_the_debug_panel(self):
        overlays = PageOverlays(None)

        overlays.changed(hidden={'debugPanel', 'minimap'})

        assert overlays.reasons() == frozenset((COVER_FULL_STATS,))

    def test_a_snapshot_with_the_reference_uncovers_a_missed_show(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(hidden={'teamBasesPanel'})

        overlays.snapshot(['teamBasesPanel', 'minimap'])

        assert overlays.reasons() == frozenset()

    def test_a_snapshot_without_the_reference_never_covers(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(visible={'teamBasesPanel'})

        overlays.snapshot(['minimap'])

        assert overlays.reasons() == frozenset()

    def test_tab_covers_the_battle(self):
        overlays = PageOverlays('fullStats')

        overlays.changed(visible={'fullStats'}, hidden={'damagePanel', 'minimap'})

        assert overlays.reasons() == frozenset((COVER_FULL_STATS,))

    def test_closing_tab_uncovers_it(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(visible={'fullStats'})

        overlays.changed(visible={'damagePanel'}, hidden={'fullStats'})

        assert overlays.reasons() == frozenset()

    def test_the_event_stats_cover_the_battle_like_tab(self):
        overlays = PageOverlays(None)

        overlays.changed(visible=['eventStats'])

        assert overlays.reasons() == frozenset((COVER_FULL_STATS,))

    def test_a_page_full_stats_alias_of_its_own_counts(self):
        overlays = PageOverlays('comp7FullStats')

        overlays.changed(visible={'comp7FullStats'})

        assert overlays.reasons() == frozenset((COVER_FULL_STATS,))

    def test_the_frontline_respawn_screen_replaces_the_battle_view(self):
        overlays = PageOverlays('fullStats')

        overlays.changed(visible={'epicRespawnView', 'epicDeploymentMap'})

        assert overlays.reasons() == frozenset((COVER_SCREEN,))

    def test_the_radial_menu_covers_nothing(self):
        overlays = PageOverlays('fullStats')

        overlays.changed(visible={'radialMenu', 'battleMessenger', 'minimap'})

        assert overlays.reasons() == frozenset()

    def test_tab_over_the_overview_map_keeps_both_until_each_closes(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(visible={'epicOverviewMapScreen'})
        overlays.changed(visible={'fullStats'})

        overlays.changed(hidden={'fullStats'})

        assert overlays.reasons() == frozenset((COVER_SCREEN,))

    def test_a_snapshot_without_the_overlay_uncovers_a_missed_close(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(visible={'fullStats'})

        overlays.snapshot(['damagePanel', 'minimap'])

        assert overlays.reasons() == frozenset()

    def test_no_snapshot_keeps_what_the_page_said(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(visible={'fullStats'})

        overlays.snapshot(None)

        assert overlays.reasons() == frozenset((COVER_FULL_STATS,))

    def test_an_unchanged_covering_set_reports_no_change(self):
        overlays = PageOverlays('fullStats')
        overlays.changed(visible={'fullStats'})

        assert not overlays.changed(visible={'fullStats', 'damagePanel'})


class WindowReasonTest(unittest.TestCase):

    def test_a_full_screen_window_hides_the_panels(self):
        assert window_reason({'flags': WINDOW | FULLSCREEN}) == COVER_SCREEN

    def test_a_full_screen_dialog_hides_the_panels(self):
        assert window_reason({'flags': DIALOG | FULLSCREEN}) == COVER_SCREEN

    def test_a_dialog_covers_nothing(self):
        assert window_reason({'flags': DIALOG}) is None

    def test_a_modal_window_covers_nothing(self):
        assert window_reason({'flags': WINDOW | WINDOW_MODAL}) is None

    def test_a_plain_window_covers_nothing(self):
        assert window_reason({'flags': WINDOW}) is None

    def test_a_pop_over_covers_nothing(self):
        assert window_reason({'flags': POP_OVER}) is None

    def test_a_tooltip_covers_nothing(self):
        assert window_reason({'flags': TOOLTIP | WINDOW_MODAL}) is None

    def test_the_main_window_covers_nothing(self):
        assert window_reason({'flags': MAIN_WINDOW | FULLSCREEN}) is None

    def test_our_own_window_covers_nothing(self):
        assert window_reason({'flags': WINDOW | FULLSCREEN, 'own': True}) is None

    def test_a_scaleform_window_is_left_to_the_modal_watch(self):
        assert window_reason({'flags': DIALOG | FULLSCREEN, 'scaleform': True}) is None

    def test_a_closing_window_covers_nothing(self):
        assert window_reason({'flags': WINDOW | FULLSCREEN, 'alive': False}) is None

    def test_a_hidden_window_covers_nothing(self):
        assert window_reason({'flags': DIALOG | FULLSCREEN, 'hidden': True}) is None


class FlashVisibleTest(unittest.TestCase):

    def test_a_covered_label_is_hidden(self):
        state = {}

        props = flash_visible(state, {'cover': 'stats'})

        assert props['visible'] is False

    def test_a_label_shown_while_covered_stays_hidden(self):
        state = {}
        flash_visible(state, {'cover': 'modal'})

        props = flash_visible(state, {'visible': True, 'text': 'x'})

        assert props['visible'] is False

    def test_the_label_comes_back_when_the_cover_goes(self):
        state = {}
        flash_visible(state, {'visible': True, 'cover': 'stats'})

        props = flash_visible(state, {'cover': ''})

        assert props['visible'] is True

    def test_a_label_hidden_with_v_stays_hidden_when_the_cover_goes(self):
        state = {}
        flash_visible(state, {'visible': False, 'cover': 'stats'})

        props = flash_visible(state, {'cover': ''})

        assert props['visible'] is False

    def test_props_without_visibility_pass_unchanged(self):
        assert flash_visible({}, {'text': 'x'}) == {'text': 'x'}


if __name__ == '__main__':
    unittest.main()
