# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.ui.escape import EscapeGuard, EscapeWatchdog


class FakeInputManager(object):

    def __init__(self):
        self.listeners = []

    def addEscapeListener(self, listener):
        self.listeners.append(listener)

    def removeEscapeListener(self, listener):
        self.listeners.remove(listener)

    def press_escape(self):
        for listener in list(self.listeners):
            listener()


class FakeClock(object):

    def __init__(self):
        self.pending = []

    def schedule(self, delay, callback):
        self.pending.append((delay, callback))

    def run_all(self):
        pending = self.pending
        self.pending = []
        for _, callback in pending:
            callback()


def is_waiting(watchdog):
    return watchdog.answered < watchdog.asked


class EscapeGuardTest(unittest.TestCase):

    def setUp(self):
        self.manager = FakeInputManager()
        self.pressed = []
        self.guard = EscapeGuard(lambda: self.manager, lambda: self.pressed.append(True))

    def test_esc_goes_to_the_open_window_instead_of_the_client_menu(self):
        held = self.guard.hold()

        self.manager.press_escape()

        assert held
        assert self.guard.held
        assert self.pressed == [True]

    def test_holds_the_key_once(self):
        self.guard.hold()

        self.guard.hold()

        assert len(self.manager.listeners) == 1

    def test_lets_the_key_go_on_close(self):
        self.guard.hold()

        self.guard.release()
        self.guard.release()
        self.manager.press_escape()

        assert self.manager.listeners == []
        assert not self.guard.held
        assert self.pressed == []

    def test_a_closing_window_releases_the_key_from_its_own_listener(self):
        guard = EscapeGuard(lambda: self.manager, lambda: guard.release())
        guard.hold()

        self.manager.press_escape()

        assert self.manager.listeners == []
        assert not guard.held

    def test_without_the_client_input_manager_nothing_is_held(self):
        assert not EscapeGuard(lambda: None, lambda: None).hold()

    def test_an_input_manager_without_escape_listeners_holds_nothing(self):
        assert not EscapeGuard(lambda: object(), lambda: None).hold()


class EscapeWatchdogTest(unittest.TestCase):

    def setUp(self):
        self.clock = FakeClock()
        self.silences = []
        self.watchdog = EscapeWatchdog(self.clock.schedule, lambda: self.silences.append(True))

    def test_each_esc_gets_the_next_number_for_the_page(self):
        first = self.watchdog.ask()

        second = self.watchdog.ask()

        assert first == 1
        assert second == 2

    def test_an_answered_esc_does_not_close_the_window(self):
        self.watchdog.ask()

        self.watchdog.answer()
        self.clock.run_all()

        assert self.silences == []
        assert not is_waiting(self.watchdog)

    def test_a_silent_page_closes_the_window_once(self):
        self.watchdog.ask()
        self.watchdog.ask()

        self.clock.run_all()

        assert self.silences == [True]
        assert not is_waiting(self.watchdog)

    def test_an_answer_to_the_last_esc_covers_the_earlier_ones(self):
        self.watchdog.ask()
        self.watchdog.ask()

        self.watchdog.answer()
        self.clock.run_all()

        assert self.silences == []

    def test_waits_for_the_answer_only_briefly(self):
        self.watchdog.ask()

        delay = self.clock.pending[0][0]

        assert is_waiting(self.watchdog)
        assert delay < 1


if __name__ == '__main__':
    unittest.main()
