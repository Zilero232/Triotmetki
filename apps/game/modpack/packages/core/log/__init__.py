"""The mod's log lines in python.log and in its own file (`open_file`, `LogFile`). Messages are written as the
interpreter's native `str`, so a Python 2 traceback holding non-ASCII bytes (a Cyrillic game path) never breaks the
logger itself."""
from __future__ import absolute_import, division, print_function, unicode_literals

import copy
import functools
import sys
import time
import traceback

from ..compat import to_native
from .constants import PREFIX
from .limiter import RepeatLimiter
from .logfile import LogFile

_repeats = RepeatLimiter(time.time)
_file = LogFile()


def _line(*parts):
    return to_native(' ').join(to_native(part) for part in parts)


def _emit(text):
    print(text)
    _file.write(text)


def open_file(path, header):
    return _file.open(path, [_line(PREFIX, line) for line in header])


def log(message):
    _emit(_line(PREFIX, message))


def flush_file():
    """Write what the log file holds to the disk (the client is closing)."""
    _file.flush()


def _error_key(kind, trace):
    while trace is not None and trace.tb_next is not None:
        trace = trace.tb_next
    where = (trace.tb_frame.f_code.co_filename, trace.tb_lineno) if trace is not None else None
    return getattr(kind, '__name__', None), where


def log_exception(context):
    """Logs the current exception with its traceback. An identical one (same context, exception type and failing
    line) is written once per REPEAT_WINDOW_S, and its traceback is formatted only then; the next one written says how
    many were held back in between. The log file is flushed after it."""
    kind, _, trace = sys.exc_info()
    write, suppressed = _repeats.admit((to_native(context), _error_key(kind, trace)))
    if not write:
        return
    lines = [_line(PREFIX, 'error in', context)]
    if suppressed:
        lines.append(_line(PREFIX, 'the same error repeated %d more times' % suppressed))
    lines.append(to_native(traceback.format_exc()))
    _emit(to_native('\n').join(lines))
    _file.flush()


def wrapped_attributes(func):
    """The `functools.WRAPPER_ASSIGNMENTS` that `func` has. Python 2's `update_wrapper` raises for a missing one, and a
    `functools.partial` has no `__name__` or `__module__` there."""
    return tuple(name for name in functools.WRAPPER_ASSIGNMENTS if hasattr(func, name))


def guarded(context, fallback=None):
    """Decorate a read of the client that may fail on API drift: an exception is logged under `context` and the call
    returns a fresh copy of `fallback`, so a caller may change what it got."""
    def decorate(func):
        @functools.wraps(func, assigned=wrapped_attributes(func))
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception:
                log_exception(context)
                return copy.deepcopy(fallback)
        return wrapper
    return decorate


def safe(func):
    """Decorate a handler the client or a callback calls: an exception is logged, the call returns None."""
    return guarded(getattr(func, '__name__', 'handler'))(func)
