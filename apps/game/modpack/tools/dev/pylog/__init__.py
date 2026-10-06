"""Tails the client's python.log (in the client folder), our lines only.

Our lines carry core.log's `[OTMETKI]` prefix or name an otmetki path; the traceback lines that follow one of them
(indented frames, `Traceback ...`, the closing `SomethingError: ...`) come along. The client rewrites python.log on
every start, so a file that shrinks is read again from its beginning.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import codecs
import locale
import os
import re
import sys
import time

PYTHON_LOG = 'python.log'
OUR_MARKS = ('[otmetki]', 'otmetki')
CONTINUATION = re.compile(r'^(\s|Traceback \(most recent call last\)|\w+(\.\w+)*(Error|Exception|Warning)\b)')
POLL_S = 0.5
TAIL_LINES = 40
# Windows names UTF-8 code page 65001; Python 2 has no codec of that name (3.3+ added it).
CODE_PAGE_ALIASES = {'cp65001': 'utf-8'}


def log_path(client):
    return os.path.join(client.path, PYTHON_LOG)


class OurLines(object):
    """Feeds lines one by one, keeps ours and the traceback lines that follow one of ours."""

    def __init__(self, keep_all=False):
        self.keep_all = keep_all
        self.following = False

    def keep(self, line):
        if self.keep_all:
            return True
        is_ours = any(mark in line.lower() for mark in OUR_MARKS)
        if is_ours:
            self.following = True
            return True
        if self.following and line.strip() and CONTINUATION.match(line):
            return True
        self.following = False
        return False

    def filter(self, lines):
        return [line for line in lines if self.keep(line)]


def safe_output(stream, encoding=None):
    """A writer over `stream` that prints what its code page lacks as '?': through bun stdout is a pipe in the ANSI
    code page (Python 2 then assumes ASCII), which lacks Cyrillic, U+FFFD (an undecodable byte of the log) or arrows."""
    encoding = encoding or getattr(stream, 'encoding', None) or locale.getpreferredencoding() or 'ascii'
    encoding = CODE_PAGE_ALIASES.get(encoding.lower(), encoding)
    try:
        writer = codecs.getwriter(encoding)
    except LookupError:
        writer = codecs.getwriter('ascii')
    return writer(stream, 'replace')


class LogReader(object):
    """The text the client appended to its log since the last read; a UTF-8 letter split between two reads comes out
    whole, and a file that shrank (the client started again) is read from its start."""

    def __init__(self, path):
        self.path = path
        self.position = 0
        self.restarted = False
        self.decoder = codecs.getincrementaldecoder('utf-8')('replace')

    def read(self):
        self.restarted = False
        if not os.path.isfile(self.path):
            return ''
        if os.path.getsize(self.path) < self.position:
            self.restarted = True
            self.position = 0
            self.decoder.reset()
        with open(self.path, 'rb') as handle:
            handle.seek(self.position)
            data = handle.read()
        self.position += len(data)
        return self.decoder.decode(data)


def _complete_lines(buffer):
    """(the finished lines, the unfinished tail)."""
    lines = buffer.split('\n')
    return [line.rstrip('\r') for line in lines[:-1]], lines[-1]


def tail(path, keep_all=False, follow=True, last=TAIL_LINES):
    """Prints our last `last` lines, then (with follow) new ones as the client writes them, until Ctrl+C."""
    lines = OurLines(keep_all)
    reader = LogReader(path)
    finished, pending = _complete_lines(reader.read())
    for line in lines.filter(finished)[-last:]:
        print(line)
    if not follow:
        return
    print('-- following %s (Ctrl+C stops)' % path)
    try:
        while True:
            time.sleep(POLL_S)
            text = reader.read()
            if reader.restarted:
                pending = ''
            finished, pending = _complete_lines(pending + text)
            for line in lines.filter(finished):
                print(line)
                sys.stdout.flush()
    except KeyboardInterrupt:
        return
