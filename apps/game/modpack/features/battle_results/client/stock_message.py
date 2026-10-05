from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr
from ....core.hooks import override
from ....core.log import log, log_exception
from ..model import with_lines
from .constants import ARENA_KEY, FORMAT_METHOD, FORMATTER_CLASS, FORMATTER_MODULE, SAVED_KEY, TEXT_KEY


def _arena_of(message):
    data = getattr(message, 'data', None)
    return data.get(ARENA_KEY) if isinstance(data, dict) else None


def appended(messages, arena, lines):
    for message_data in messages or ():
        data = getattr(message_data, 'data', None)
        if isinstance(data, dict) and data.get(SAVED_KEY) == arena and TEXT_KEY in data:
            data[TEXT_KEY] = with_lines(data[TEXT_KEY], lines)
    return messages


# The stock post-battle message, held until `on_message(arena, messages, callback)` calls `callback(messages)`: the
# formatter's caller hands the list to the service channel only then. A failing handler still lets the message out.
class StockMessageHook(object):

    def __init__(self, on_message):
        self.on_message = on_message
        self.installed = False
        formatter = client_attr(FORMATTER_MODULE, FORMATTER_CLASS)
        if formatter is None or getattr(formatter, FORMAT_METHOD, None) is None:
            log('battle results: %s.%s not found, own message instead' % (FORMATTER_CLASS, FORMAT_METHOD))
            return
        override(formatter, FORMAT_METHOD)(self._format)
        self.installed = True

    def _format(self, original, formatter, message, *args, **kwargs):
        caller = original(formatter, message, *args, **kwargs)
        arena = _arena_of(message)
        if arena is None or not callable(caller):
            return caller

        def held(callback):
            caller(callback=lambda messages: self._deliver(arena, messages, callback))
        return held

    def _deliver(self, arena, messages, callback):
        try:
            self.on_message(arena, messages, callback)
        except Exception:
            log_exception('battle results: stock message')
            callback(messages)
