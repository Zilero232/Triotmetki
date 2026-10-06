# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import shutil
import tempfile
import unittest

import _support  # noqa: F401
from otmetki.core.log.logfile import LogFile, rotate

T0 = 1790000000.25
REPLACEMENT_CHARACTER = u'�'


def read(path):
    with io.open(path, encoding='utf-8') as handle:
        return handle.read().splitlines()


def message_of(line):
    return line.split(' ', 2)[2]


def time_of(line):
    return line.split(' ')[1]


def fixed_clock():
    return T0


class Clock(object):

    def __init__(self):
        self.now = T0

    def __call__(self):
        return self.now


class LogFileTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root)
        self.path = os.path.join(self.root, 'configs', 'otmetki.log')
        self.opened = []

    def log_file(self, **options):
        logfile = LogFile(clock=options.pop('clock', fixed_clock), **options)
        self.addCleanup(logfile.close)
        self.opened.append(logfile)
        return logfile

    def read(self, path=None):
        for logfile in self.opened:
            logfile.flush()
        return read(path or self.path)

    def unwritable_path(self):
        blocker = os.path.join(self.root, 'file')
        with open(blocker, 'w') as handle:
            handle.write('')
        return os.path.join(blocker, 'otmetki.log')

    def test_open_on_a_writable_path_succeeds(self):
        logfile = self.log_file()

        opened = logfile.open(self.path, ['header'])

        assert opened

    def test_lines_before_open_follow_the_header(self):
        logfile = self.log_file()
        logfile.write('early')

        logfile.open(self.path, ['header 1', 'header 2'])
        logfile.write(u'позже')

        messages = [message_of(line) for line in self.read()]
        assert messages == ['header 1', 'header 2', 'early', u'позже']

    def test_line_time_carries_milliseconds(self):
        logfile = self.log_file()

        logfile.open(self.path, ['header'])

        assert time_of(self.read()[0]).endswith('.250')

    def test_bytes_lines_with_broken_utf8_are_kept(self):
        logfile = self.log_file()
        logfile.open(self.path, [])

        logfile.write(b'path \xcf\xf3\xf2\xfc')

        line = self.read()[0]
        assert message_of(line).startswith('path ')
        assert REPLACEMENT_CHARACTER in line

    def test_each_session_shifts_the_older_files_and_keeps_three(self):
        for session in range(5):
            logfile = self.log_file(keep=3)
            logfile.open(self.path, ['session %d' % session])
            logfile.close()

        names = sorted(os.listdir(os.path.dirname(self.path)))
        assert names == ['otmetki.1.log', 'otmetki.2.log', 'otmetki.log']
        assert self.read()[0].endswith('session 4')
        assert self.read(os.path.join(self.root, 'configs', 'otmetki.2.log'))[0].endswith('session 2')

    def test_a_session_past_the_size_limit_starts_a_new_file(self):
        logfile = self.log_file(keep=3, max_bytes=200)
        logfile.open(self.path, ['header'])

        for index in range(10):
            logfile.write('line %d %s' % (index, 'x' * 40))
        logfile.flush()

        assert os.path.getsize(self.path) <= 200
        assert message_of(self.read()[-1]).startswith('line 9')
        assert len(os.listdir(os.path.dirname(self.path))) == 3

    def test_a_line_waits_in_the_buffer_within_the_flush_interval(self):
        logfile = self.log_file()
        logfile.open(self.path, ['header'])

        logfile.write('buffered')

        assert [message_of(line) for line in read(self.path)] == ['header']

    def test_a_line_after_the_flush_interval_reaches_the_disk(self):
        clock = Clock()
        logfile = self.log_file(clock=clock, flush_s=1.0)
        logfile.open(self.path, ['header'])
        logfile.write('first')
        clock.now += 1.5

        logfile.write('second')

        assert [message_of(line) for line in read(self.path)] == ['header', 'first', 'second']

    def test_the_file_is_opened_once_per_session(self):
        logfile = self.log_file()
        logfile.open(self.path, ['header'])
        handle = logfile.handle

        for index in range(5):
            logfile.write('line %d' % index)

        assert logfile.handle is handle

    def test_lines_held_before_open_are_bounded(self):
        logfile = self.log_file(pending_lines=2)

        for index in range(5):
            logfile.write('line %d' % index)

        assert len(logfile.pending) == 2

    def test_open_on_an_unwritable_path_fails(self):
        logfile = self.log_file()

        opened = logfile.open(self.unwritable_path(), ['header'])

        assert not opened

    def test_a_disk_error_stops_the_file(self):
        logfile = self.log_file()
        logfile.open(self.unwritable_path(), ['header'])

        logfile.write('ignored')

        assert logfile.failed

    def test_rotate_without_files_does_nothing(self):
        rotate(self.path, 3)

        assert not os.path.exists(os.path.dirname(self.path))


if __name__ == '__main__':
    unittest.main()
