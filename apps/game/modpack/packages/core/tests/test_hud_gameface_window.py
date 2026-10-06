from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

from test_hud_gameface_space import GamefaceBackendCase


class GamefaceInputTest(GamefaceBackendCase):

    def test_the_battle_page_takes_no_mouse_without_the_cursor(self):
        self.battle_up()

        self.assertFalse(self.battle.mouse[-1])

    def test_the_battle_cursor_gives_the_battle_page_the_mouse(self):
        self.battle_up()

        self.backend._set_cursor(True)

        self.assertTrue(self.battle.mouse[-1])

    def test_the_battle_cursor_leaves_the_hangar_page_without_the_mouse(self):
        self.battle_up()

        self.backend._set_cursor(True)

        self.assertFalse(self.hangar.mouse[-1])

    def test_hiding_the_battle_cursor_takes_the_mouse_back(self):
        self.battle_up()
        self.backend._set_cursor(True)

        self.backend._set_cursor(False)

        self.assertFalse(self.battle.mouse[-1])

    def test_the_battle_cursor_puts_the_battle_page_in_edit_mode(self):
        view = self.battle_up()

        self.backend._set_cursor(True)
        self.run_frames()

        self.assertTrue(view.viewModel.states[-1]['edit'])

    def test_the_edit_modifier_gives_the_hangar_page_the_mouse(self):
        self.space[0] = 'lobby'
        self.backend.modifier.held = True

        self.backend._on_modifier(True)

        self.assertTrue(self.hangar.mouse[-1])

    def test_the_edit_modifier_alone_gives_the_battle_page_no_mouse(self):
        self.backend.modifier.held = True

        self.backend._on_modifier(True)

        self.assertFalse(self.battle.mouse[-1])

    def test_a_new_battle_page_reads_the_cursor_again(self):
        self.backend.cursor = True
        self.cursor[0] = False

        self.battle_up()

        self.assertFalse(self.backend.cursor)

    def test_the_first_battle_cursor_is_logged(self):
        self.battle_up()

        self.backend._set_cursor(True)

        self.assertIn('HUD: battle cursor shown, panels can be dragged', self.lines)

    def test_a_battle_page_left_without_the_mouse_over_a_panel_says_so(self):
        self.battle_up()
        self.backend._set_cursor(True)

        self.backend.on_inject_gone(self.battle)

        self.assertIn('HUD: the battle cursor was shown, but the page saw no mouse over a panel', self.lines)

    def test_the_page_input_area_is_logged_once_per_change(self):
        for whole in (False, False, True, True, False):
            self.backend._on_page_area({'whole': whole})

        area_lines = [line for line in self.lines if 'takes the mouse' in line]
        self.assertEqual(len(area_lines), 3)

    def test_a_whole_screen_input_area_is_logged_with_the_edit_state(self):
        self.space[0] = 'lobby'

        self.backend._on_page_area({'whole': True})

        self.assertEqual(self.lines[-1], 'HUD: the page takes the mouse over the whole screen (lobby, not editing)')

    def test_a_cursor_hidden_without_an_event_ends_the_battle_edit(self):
        self.backend._set_cursor(True)
        self.cursor[0] = False

        self.backend._poll_cursor()

        self.assertFalse(self.backend.editing())

    def test_a_cursor_hidden_without_an_event_is_logged(self):
        self.backend._set_cursor(True)
        self.cursor[0] = False

        self.backend._poll_cursor()

        expected = 'HUD: the battle cursor was hidden without an event, the panels stop taking the mouse'
        self.assertEqual(self.lines[-1], expected)

    def test_the_cursor_poll_stops_once_the_cursor_is_hidden(self):
        self.backend._set_cursor(True)
        self.cursor[0] = False

        self.assertFalse(self.backend._poll_cursor())

    def test_the_cursor_poll_goes_on_while_the_cursor_is_shown(self):
        self.backend._set_cursor(True)
        self.cursor[0] = True

        self.assertTrue(self.backend._poll_cursor())

    def test_the_cursor_poll_starts_when_the_battle_cursor_shows(self):
        started = []
        self.backend.cursor_poll.start = lambda: started.append(True)

        self.backend._set_cursor(True)

        self.assertEqual(started, [True])


if __name__ == '__main__':
    unittest.main()
