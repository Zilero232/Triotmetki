# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer, panel_schema
from otmetki.core.hud.layer.constants import (
    COVER_FULL_STATS,
    COVER_GUI,
    COVER_KILLCAM,
    COVER_LOADING,
    COVER_MENU,
    COVER_SCREEN,
)
from otmetki.core.hud.panel import fit_place
from _support import MemoryFile


class Recorder(HudBackend):

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
        self.calls.append(('delete', {}))
        return True


def shown_layer():
    backend = Recorder()
    layer = HudLayer(backend, ComponentConfig(MemoryFile()))
    layer.register('panel', panel_schema({}))
    layer.show('panel', 'text')
    del backend.calls[:]
    return layer, backend


class CoverTest(unittest.TestCase):

    def test_the_killer_camera_hides_the_panels(self):
        layer, backend = shown_layer()

        layer.set_cover(COVER_KILLCAM, True)

        assert backend.calls == [('update', {'visible': False})]

    def test_the_loading_screen_hides_the_panels(self):
        layer, backend = shown_layer()

        layer.set_cover(COVER_LOADING, True)

        assert backend.calls == [('update', {'visible': False})]

    def test_tab_hides_the_panels(self):
        layer, backend = shown_layer()

        layer.set_cover(COVER_FULL_STATS, True)

        assert backend.calls == [('update', {'visible': False})]

    def test_a_modal_stock_view_fades_every_panel(self):
        layer, backend = shown_layer()

        layer.set_cover(COVER_MENU, True)

        assert backend.calls == [('update', {'cover': 'modal'})]

    def test_the_modal_fade_wins_over_the_full_stats_one(self):
        layer, _ = shown_layer()
        layer.set_cover(COVER_FULL_STATS, True)

        layer.set_cover(COVER_MENU, True)

        assert layer.cover == 'modal'

    def test_the_full_stats_keep_the_panels_hidden_when_the_modal_view_closes(self):
        layer, _ = shown_layer()
        layer.set_cover(COVER_FULL_STATS, True)
        layer.set_cover(COVER_MENU, True)

        layer.set_cover(COVER_MENU, False)

        assert layer.gui_hidden

    def test_a_panel_shown_under_a_modal_view_is_created_faded(self):
        backend = Recorder()
        layer = HudLayer(backend, ComponentConfig(MemoryFile()))
        layer.register('panel', panel_schema({}))
        layer.set_menu(True)

        layer.show('panel', 'text')

        assert backend.calls[0][1]['cover'] == 'modal'

    def test_a_covered_panel_is_never_deleted(self):
        layer, backend = shown_layer()

        for reason in (COVER_GUI, COVER_KILLCAM, COVER_LOADING, COVER_FULL_STATS, COVER_MENU):
            layer.set_cover(reason, True)
            layer.set_cover(reason, False)

        assert 'delete' not in [call for call, _ in backend.calls]

    def test_a_second_hiding_reason_sends_nothing_more(self):
        layer, backend = shown_layer()
        layer.set_cover(COVER_GUI, True)

        layer.set_cover(COVER_KILLCAM, True)

        assert backend.calls == [('update', {'visible': False})]

    def test_panels_stay_hidden_until_every_hiding_reason_is_gone(self):
        layer, _ = shown_layer()
        layer.set_cover(COVER_GUI, True)
        layer.set_cover(COVER_KILLCAM, True)

        layer.set_cover(COVER_GUI, False)

        assert layer.gui_hidden

    def test_panels_come_back_when_the_last_reason_goes(self):
        layer, backend = shown_layer()
        layer.set_cover(COVER_LOADING, True)

        layer.set_cover(COVER_LOADING, False)

        assert backend.calls[-1] == ('update', {'visible': True})

    def test_a_screen_over_the_battle_hides_the_panels(self):
        layer, backend = shown_layer()

        layer.set_cover(COVER_SCREEN, True)

        assert backend.calls == [('update', {'visible': False})]

    def test_the_killer_camera_releases_the_stock_elements(self):
        layer, _ = shown_layer()

        layer.set_cover(COVER_KILLCAM, True)

        assert layer.releases_stock('panel')

    def test_tab_keeps_the_stock_elements_suppressed(self):
        layer, _ = shown_layer()

        layer.set_cover(COVER_FULL_STATS, True)

        assert not layer.releases_stock('panel')

    def test_a_muted_panel_releases_the_stock_elements(self):
        layer, _ = shown_layer()

        layer.set_muted(True)

        assert layer.releases_stock('panel')

    def test_watchers_hear_a_new_cover_reason(self):
        layer, _ = shown_layer()
        heard = []
        layer.watch(lambda: heard.append(True))

        layer.set_cover(COVER_KILLCAM, True)

        assert heard == [True]

    def test_watchers_hear_the_mute(self):
        layer, _ = shown_layer()
        heard = []
        layer.watch(lambda: heard.append(True))

        layer.set_muted(True)

        assert heard == [True]

    def test_an_unknown_reason_changes_nothing(self):
        layer, backend = shown_layer()

        assert not layer.set_cover('chat', True)
        assert backend.calls == []

    def test_a_panel_shown_while_covered_is_created_hidden(self):
        backend = Recorder()
        layer = HudLayer(backend, ComponentConfig(MemoryFile()))
        layer.register('panel', panel_schema({}))
        layer.set_cover(COVER_KILLCAM, True)

        layer.show('panel', 'text')

        assert backend.calls[0][1]['visible'] is False


class FitPlaceTest(unittest.TestCase):

    def test_a_place_on_screen_stays(self):
        assert fit_place({'x': 20, 'y': -40, 'align_x': 'left', 'align_y': 'bottom'}) == {}

    def test_a_centred_place_stays_whatever_its_sign(self):
        assert fit_place({'x': -300, 'y': 0, 'align_x': 'center', 'align_y': 'center'}) == {}

    def test_a_left_offset_past_the_left_edge_goes_to_the_edge(self):
        assert fit_place({'x': -50, 'y': 10, 'align_x': 'left', 'align_y': 'top'}) == {'x': 0}

    def test_a_right_offset_past_the_right_edge_goes_to_the_edge(self):
        assert fit_place({'x': 30, 'y': 10, 'align_x': 'right', 'align_y': 'top'}) == {'x': 0}

    def test_a_top_offset_above_the_screen_goes_to_the_edge(self):
        assert fit_place({'x': 0, 'y': -8, 'align_x': 'center', 'align_y': 'top'}) == {'y': 0}

    def test_a_bottom_offset_below_the_screen_goes_to_the_edge(self):
        assert fit_place({'x': 0, 'y': 12, 'align_x': 'center', 'align_y': 'bottom'}) == {'y': 0}

    def test_a_saved_place_off_screen_is_moved_back_on_register(self):
        config = ComponentConfig(MemoryFile({'panel': {'x': -120, 'y': 40, 'align_x': 'left', 'align_y': 'top'}}))
        layer = HudLayer(Recorder(), config)

        settings = layer.register('panel', panel_schema({}))

        assert (settings.get('x'), settings.get('y')) == (0, 40)


if __name__ == '__main__':
    unittest.main()
