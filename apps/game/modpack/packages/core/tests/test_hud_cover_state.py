# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.hud.cover import CoverState, FollowedComponents, PageOverlays
from otmetki.core.hud.layer.constants import COVER_FULL_STATS, COVER_GUI, COVER_LOADING, COVER_SCREEN


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
        state.report('loading', (COVER_SCREEN,))
        state.report('page', ())

        state.report('loading', ())

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

    def test_the_window_switch_off_leaves_only_v_and_the_loading_screen(self):
        state = CoverState()
        state.report('gui', (COVER_GUI,))
        state.report('page', (COVER_FULL_STATS, COVER_SCREEN))

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


class FollowedComponentsTest(unittest.TestCase):

    def test_the_page_hiding_the_consumables_panel_on_death_hides_it(self):
        followed = FollowedComponents()

        assert followed.changed(hidden={'consumablesPanel'})
        assert followed.hidden == frozenset(('consumablesPanel',))

    def test_the_page_showing_it_again_on_respawn_brings_it_back(self):
        followed = FollowedComponents()
        followed.changed(hidden={'consumablesPanel'})

        assert followed.changed(visible={'consumablesPanel'})
        assert followed.hidden == frozenset()

    def test_components_nobody_follows_are_left_out(self):
        followed = FollowedComponents()

        assert not followed.changed(hidden={'damagePanel', 'teamBasesPanel'})
        assert followed.hidden == frozenset()

    def test_the_minimap_is_followed_too(self):
        followed = FollowedComponents()

        followed.changed(hidden={'minimap', 'consumablesPanel'})

        assert followed.hidden == frozenset(('minimap', 'consumablesPanel'))

    def test_a_component_both_shown_and_hidden_in_one_call_is_shown(self):
        followed = FollowedComponents()
        followed.changed(hidden={'consumablesPanel'})

        followed.changed(visible={'consumablesPanel'}, hidden={'consumablesPanel'})

        assert followed.hidden == frozenset()

    def test_the_page_answering_hidden_hides_it(self):
        followed = FollowedComponents()

        assert followed.answered('consumablesPanel', False)
        assert followed.hidden == frozenset(('consumablesPanel',))

    def test_an_answer_that_is_not_a_flag_changes_nothing(self):
        followed = FollowedComponents()
        followed.changed(hidden={'consumablesPanel'})

        assert not followed.answered('consumablesPanel', None)
        assert not followed.answered('damagePanel', True)
        assert followed.hidden == frozenset(('consumablesPanel',))

    def test_the_pre_battle_setups_panel_takes_the_consumables_place(self):
        followed = FollowedComponents()

        assert followed.setups(True)
        assert followed.hidden == frozenset(('consumablesPanel',))

    def test_the_consumables_come_back_when_the_setups_panel_closes(self):
        followed = FollowedComponents()
        followed.setups(True)

        followed.setups(False)

        assert followed.hidden == frozenset()

    def test_the_consumables_stay_hidden_while_the_page_still_hides_them(self):
        followed = FollowedComponents()
        followed.setups(True)
        followed.changed(hidden={'consumablesPanel'})

        followed.setups(False)

        assert followed.hidden == frozenset(('consumablesPanel',))


if __name__ == '__main__':
    unittest.main()
