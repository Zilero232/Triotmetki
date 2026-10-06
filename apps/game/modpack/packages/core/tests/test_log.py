from __future__ import absolute_import, division, print_function, unicode_literals

import functools
import io
import sys
import unittest

import _support  # noqa: F401
from otmetki.core import log
from otmetki.core.log.limiter import RepeatLimiter
from otmetki.core.shells import shell_code, shell_name


class Clock(object):

    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class RepeatLimiterTest(unittest.TestCase):

    def setUp(self):
        self.clock = Clock()
        self.limiter = RepeatLimiter(self.clock, window_s=60, max_tracked=10)

    def admit_repeatedly(self, key, times):
        return [self.limiter.admit(key) for _ in range(times)]

    def test_the_first_occurrence_is_admitted(self):
        admitted = self.limiter.admit('a')

        assert admitted == (True, 0)

    def test_repeats_within_the_window_are_held_back(self):
        self.limiter.admit('a')

        repeats = self.admit_repeatedly('a', 3)

        assert repeats == [(False, 0), (False, 0), (False, 0)]

    def test_another_key_is_admitted_on_its_own(self):
        self.admit_repeatedly('a', 4)

        admitted = self.limiter.admit('b')

        assert admitted == (True, 0)

    def test_the_first_occurrence_after_the_window_reports_the_held_back_count(self):
        self.admit_repeatedly('a', 4)
        self.clock.now += 61

        admitted = self.limiter.admit('a')

        assert admitted == (True, 3)

    def test_a_new_window_holds_repeats_back_again(self):
        self.admit_repeatedly('a', 4)
        self.clock.now += 61
        self.limiter.admit('a')

        repeat = self.limiter.admit('a')

        assert repeat == (False, 0)

    def test_tracks_a_bounded_number_of_keys(self):
        limiter = RepeatLimiter(self.clock, window_s=60, max_tracked=2)
        limiter.admit('a')
        self.clock.now += 1
        limiter.admit('b')
        self.clock.now += 1

        limiter.admit('c')

        assert sorted(limiter.seen) == ['b', 'c']


class LogExceptionTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.stdout, log._repeats
        self.clock = Clock()
        log._repeats = RepeatLimiter(self.clock)
        self.out = io.StringIO() if sys.version_info[0] >= 3 else io.BytesIO()
        sys.stdout = self.out

    def tearDown(self):
        sys.stdout, log._repeats = self.saved

    def broken(self):
        return 1 // 0

    def fail_repeatedly(self, handler, times):
        for _ in range(times):
            handler()

    def test_identical_tracebacks_are_written_once_per_window(self):
        handler = log.safe(self.broken)

        self.fail_repeatedly(handler, 50)

        assert self.out.getvalue().count('Traceback') == 1

    def test_a_held_back_repeat_formats_no_traceback(self):
        handler = log.safe(self.broken)
        formatted = []
        original = log.traceback.format_exc
        log.traceback.format_exc = lambda: formatted.append(1) or original()
        self.addCleanup(setattr, log.traceback, 'format_exc', original)

        self.fail_repeatedly(handler, 50)

        assert len(formatted) == 1

    def test_the_same_error_from_another_line_is_written_on_its_own(self):
        try:
            self.broken()
        except ZeroDivisionError:
            log.log_exception('handler')

        try:
            1 // 0
        except ZeroDivisionError:
            log.log_exception('handler')

        assert self.out.getvalue().count('Traceback') == 2

    def test_the_next_window_writes_the_traceback_again(self):
        handler = log.safe(self.broken)
        self.fail_repeatedly(handler, 50)
        self.clock.now += 61

        handler()

        assert self.out.getvalue().count('Traceback') == 2

    def test_the_next_window_reports_how_often_it_repeated(self):
        handler = log.safe(self.broken)
        self.fail_repeatedly(handler, 50)
        self.clock.now += 61

        handler()

        assert 'repeated 49 more times' in self.out.getvalue()


def add(first, second):
    return first + second


class SafeTest(unittest.TestCase):

    def test_a_partial_handler_can_be_guarded(self):
        guarded = log.safe(functools.partial(add, 1))

        assert guarded(2) == 3

    def test_a_partial_has_no_name_to_copy(self):
        names = log.wrapped_attributes(functools.partial(add, 1))

        assert '__name__' not in names

    def test_a_function_keeps_its_name(self):
        assert log.safe(add).__name__ == 'add'


def broken_read():
    return 1 // 0


class GuardedTest(unittest.TestCase):

    def setUp(self):
        self.saved = sys.stdout, log._repeats
        log._repeats = RepeatLimiter(Clock())
        self.out = io.BytesIO()
        sys.stdout = self.out

    def tearDown(self):
        sys.stdout, log._repeats = self.saved

    def test_a_working_read_returns_its_value(self):
        read = log.guarded('read', fallback=0)(functools.partial(add, 1))

        assert read(2) == 3

    def test_a_failing_read_returns_the_fallback(self):
        read = log.guarded('read', fallback=[])(broken_read)

        assert read() == []

    def test_a_failing_read_is_logged_under_its_context(self):
        read = log.guarded('crew xp: crew')(broken_read)

        read()

        assert 'error in crew xp: crew' in self.out.getvalue()

    def test_each_failure_returns_its_own_fallback(self):
        read = log.guarded('read', fallback=([], {}))(broken_read)
        read()[0].append(1)

        fallback = read()

        assert fallback == ([], {})


class ShellTypesTest(unittest.TestCase):
    # RU 1.45 client source, common/constants.py BATTLE_LOG_SHELL_TYPES: 0..14.

    def test_the_last_client_shell_type_has_a_name(self):
        assert shell_name(14) == 'HE_MODERN_DF'

    def test_the_last_client_shell_type_has_a_code(self):
        assert shell_code(14) == 'he'

    def test_a_shell_type_past_the_client_range_has_no_name(self):
        assert shell_name(15) is None


if __name__ == '__main__':
    unittest.main()
