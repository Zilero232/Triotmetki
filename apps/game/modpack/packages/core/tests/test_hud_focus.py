from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.hud.focus import (
    FOCUS_GIVE_UP,
    FOCUS_HAND_ON,
    FOCUS_KEEP,
    FOCUS_WAIT,
    FocusReturn,
    WindowInfo,
    focus_target,
)

VIEW = 4
WINDOW = 7
OVERLAY = 11
CURSOR = 15
MARKER = 3
SERVICE_WINDOW = 98
TOOLTIP = 49


class FocusTargetTest(unittest.TestCase):

    def test_the_page_under_the_hud_gets_the_focus(self):
        windows = [WindowInfo('markers', MARKER, SERVICE_WINDOW, True), WindowInfo('lobby', VIEW, SERVICE_WINDOW, True)]

        self.assertEqual(focus_target(windows), 'lobby')

    def test_an_open_window_over_the_page_gets_it_first(self):
        windows = [WindowInfo('lobby', VIEW, SERVICE_WINDOW, True), WindowInfo('settings', OVERLAY, 1, True)]

        self.assertEqual(focus_target(windows), 'settings')

    def test_the_cursor_layer_never_gets_it(self):
        windows = [WindowInfo('lobby', VIEW, SERVICE_WINDOW, True), WindowInfo('cursor', CURSOR, SERVICE_WINDOW, True)]

        self.assertEqual(focus_target(windows), 'lobby')

    def test_a_tooltip_never_gets_it(self):
        windows = [WindowInfo('lobby', VIEW, SERVICE_WINDOW, True), WindowInfo('tooltip', WINDOW, TOOLTIP, True)]

        self.assertEqual(focus_target(windows), 'lobby')

    def test_a_window_not_ready_never_gets_it(self):
        windows = [WindowInfo('lobby', VIEW, SERVICE_WINDOW, True), WindowInfo('hud', WINDOW, 1, False)]

        self.assertEqual(focus_target(windows), 'lobby')

    def test_the_last_window_of_a_layer_wins(self):
        windows = [WindowInfo('first', WINDOW, 1, True), WindowInfo('second', WINDOW, 1, True)]

        self.assertEqual(focus_target(windows), 'second')

    def test_no_target_without_a_window_that_can_take_it(self):
        windows = [WindowInfo('markers', MARKER, SERVICE_WINDOW, True)]

        self.assertIsNone(focus_target(windows))


class FocusReturnTest(unittest.TestCase):

    def test_a_focus_is_handed_on(self):
        focus = FocusReturn()

        self.assertEqual(focus.decide(10.0, False), FOCUS_HAND_ON)

    def test_a_focus_waits_while_a_panel_is_edited(self):
        focus = FocusReturn()

        self.assertEqual(focus.decide(10.0, True), FOCUS_WAIT)

    def test_a_focus_taken_again_later_is_handed_on_again(self):
        focus = FocusReturn()
        focus.handed_on(10.0)

        self.assertEqual(focus.decide(20.0, False), FOCUS_HAND_ON)

    def test_the_window_gives_up_after_the_client_gives_the_focus_back_three_times(self):
        focus = FocusReturn()
        decisions = []

        for now in (10.0, 10.1, 10.2):
            focus.handed_on(now)
            decisions.append(focus.decide(now + 0.05, False))

        self.assertEqual(decisions, [FOCUS_HAND_ON, FOCUS_HAND_ON, FOCUS_GIVE_UP])

    def test_after_giving_up_the_window_keeps_the_focus_quietly(self):
        focus = FocusReturn()
        for now in (10.0, 10.1, 10.2):
            focus.handed_on(now)
            focus.decide(now + 0.05, False)
        focus.handed_on(10.3)

        self.assertEqual(focus.decide(10.35, False), FOCUS_KEEP)

    def test_without_a_game_clock_every_focus_is_handed_on(self):
        focus = FocusReturn()
        focus.handed_on(None)

        self.assertEqual(focus.decide(None, False), FOCUS_HAND_ON)


if __name__ == '__main__':
    unittest.main()
