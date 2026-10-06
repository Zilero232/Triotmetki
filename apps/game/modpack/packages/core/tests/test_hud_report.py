# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.hud import ComponentConfig, HudBackend, HudLayer, HudSurface, panel_schema
from otmetki.core.hud.report import PanelReport
from otmetki.core.hud.widget import widget
from otmetki.core.storage import MemoryFile


class Backend(HudBackend):

    name = 'fake'

    def available(self):
        return True

    def create(self, alias, props):
        return True

    def update(self, alias, props):
        return True

    def delete(self, alias):
        return True


def reported(*panel_ids, **flags):
    layer = HudLayer(Backend(), ComponentConfig(MemoryFile()))
    report = PanelReport(layer)
    for panel_id in panel_ids:
        layer.register(panel_id, panel_schema({'x': 10, 'y': 10, 'align_x': 'left', 'align_y': 'top'}))
        report.track(panel_id, lambda: flags.get('enabled', True))
    return layer, report


class PanelReportTest(unittest.TestCase):

    def test_a_panel_with_its_switch_off_is_off(self):
        _, report = reported('loadout', enabled=False)

        assert report.status('loadout') == 'off'

    def test_a_shown_panel_is_shown(self):
        layer, report = reported('loadout')

        layer.show('loadout', u'text')

        assert report.status('loadout') == 'shown'

    def test_a_panel_that_never_showed_is_not_published(self):
        _, report = reported('loadout')

        assert report.status('loadout') == 'not published'

    def test_a_waiting_panel_says_why(self):
        _, report = reported('loadout')

        report.note('loadout', 'no vehicle yet')

        assert report.status('loadout') == 'waiting: no vehicle yet'

    def test_a_cleared_note_leaves_the_panel_unpublished(self):
        _, report = reported('loadout')
        report.note('loadout', 'no vehicle yet')

        report.note('loadout', None)

        assert report.status('loadout') == 'not published'

    def test_a_muted_panel_is_held_by_the_streamer_hotkey(self):
        layer, report = reported('loadout')
        layer.set_muted(True)

        layer.show('loadout', u'text')

        assert report.status('loadout') == 'held: the streamer hotkey'

    def test_a_panel_the_battle_type_leaves_out_is_held_by_its_layout(self):
        layer, report = reported('loadout')
        layer.set_policy(lambda mode: (['marks_panel'], False))

        layer.enter_mode('event')

        assert report.status('loadout') == 'held: the event battle type layout leaves it out'

    def test_a_panel_hidden_with_the_stock_gui_is_shown_but_hidden(self):
        layer, report = reported('loadout')
        layer.show('loadout', u'text')

        layer.set_gui_hidden(True)

        assert report.status('loadout').startswith('shown, hidden')

    def test_the_line_lists_every_tracked_panel_by_id(self):
        layer, report = reported('marks_panel', 'battle_loadout')
        layer.show('marks_panel', u'text')
        report.note('battle_loadout', 'no vehicle yet')

        text = report.text('random')

        assert text == (
            'HUD report (random): battle_loadout waiting: no vehicle yet; marks_panel shown; stock: no battle page'
        )

    def test_the_line_ends_with_the_stock_aliases_found_and_hidden(self):
        _, report = reported('damage_log')
        stock = {'page': 'eventBattlePage', 'found': ['battleDamageLogPanel', 'sixthSense'], 'hidden': []}

        text = report.text('event', stock)

        assert text.endswith('; stock on eventBattlePage: found battleDamageLogPanel, sixthSense, hidden -')


class SurfaceSummaryTest(unittest.TestCase):

    def test_a_label_names_its_widget_kind(self):
        surface = HudSurface()

        surface.create('otmetki.hud.battle_loadout', {'widget': widget('battle_loadout', {})}, 'battle')

        assert surface.summary('battle') == ['battle_loadout[battle_loadout]']

    def test_a_text_label_is_text(self):
        surface = HudSurface()

        surface.create('otmetki.hud.team_hp', {'text': u'12:00'}, 'battle')

        assert surface.summary('battle') == ['team_hp[text]']

    def test_an_invisible_label_is_marked_hidden(self):
        surface = HudSurface()

        surface.create('otmetki.hud.team_hp', {'text': u'12:00', 'visible': False}, 'battle')

        assert surface.summary('battle') == ['team_hp[text] hidden']

    def test_labels_of_the_other_space_are_left_out(self):
        surface = HudSurface()

        surface.create('otmetki.session', {'text': u'x'}, 'lobby')

        assert surface.summary('battle') == []


if __name__ == '__main__':
    unittest.main()
