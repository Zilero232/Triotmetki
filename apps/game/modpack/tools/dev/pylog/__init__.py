"""Tails the client's python.log (in the client folder), our lines only.

Our lines carry core.log's `[OTMETKI]` prefix or name an otmetki path; the traceback lines that follow one of them
(indented frames, `Traceback ...`, the closing `SomethingError: ...`) come along. The client rewrites python.log on
every start, so a file that shrinks is read again from its beginning.
"""
import os
import re
import time

PYTHON_LOG = 'python.log'
OUR_MARKS = ('[otmetki]', 'otmetki')
CONTINUATION = re.compile(r'^(\s|Traceback \(most recent call last\)|\w+(\.\w+)*(Error|Exception|Warning)\b)')
POLL_S = 0.5
TAIL_LINES = 40


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


def decode(data):
    return data.decode('utf-8', 'replace')


def _read_from(path, position):
    """(new text since position, the new position)."""
    with open(path, 'rb') as handle:
        handle.seek(position)
        data = handle.read()
    return decode(data), position + len(data)


def _complete_lines(buffer):
    """(the finished lines, the unfinished tail)."""
    lines = buffer.split('\n')
    return [line.rstrip('\r') for line in lines[:-1]], lines[-1]


def tail(path, keep_all=False, follow=True, last=TAIL_LINES):
    """Prints our last `last` lines, then (with follow) new ones as the client writes them, until Ctrl+C."""
    lines = OurLines(keep_all)
    position = 0
    pending = ''
    if os.path.isfile(path):
        text, position = _read_from(path, 0)
        finished, pending = _complete_lines(text)
        for line in lines.filter(finished)[-last:]:
            print(line)
    if not follow:
        return
    print('-- following %s (Ctrl+C stops)' % path)
    try:
        while True:
            time.sleep(POLL_S)
            if not os.path.isfile(path):
                continue
            if os.path.getsize(path) < position:
                position, pending = 0, ''
            text, position = _read_from(path, position)
            finished, pending = _complete_lines(pending + text)
            for line in lines.filter(finished):
                print(line, flush=True)
    except KeyboardInterrupt:
        return
