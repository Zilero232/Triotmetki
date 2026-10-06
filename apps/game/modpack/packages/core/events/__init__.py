"""The app's event bus: one blinker signal per event name (`app.bus`).

Blinker keeps the receivers; the bus adds what the mod needs on top: handlers take the event's own
positional arguments (not blinker's `sender`), run in subscription order on both Pythons, and a failing
handler is logged without stopping the ones after it, so one feature cannot break another.

Events sent between packages (not by the app host) are named here: `component_settings(component_id,
changed_keys)` from the settings window and a profile load, `replay_uploaded(arena_unique_id, replay_id)`
from the replay upload, `replay_upload_request(request, reply)` from the replay manager, `settings_close()` to
close the settings window, `mods_list_alert(on)` for the badge on the mod's ModsList entry,
`hit_viewer_open(battle_id)` to open the hit viewer at a recorded battle, `hit_viewer_battles(reply)` for the battles
it can open (`hit_viewer_battles(bus)` asks),
`battle_notice_lines(arena_id, reply)` for the lines added to the stock post-battle message
(`battle_notice_lines(bus, arena_id)` asks).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from collections import OrderedDict

from ..log import log_exception
from ..vendor.blinker import NamedSignal, Namespace
from .constants import (
    EVENT_BATTLE_NOTICE_LINES,
    EVENT_COMPONENT_SETTINGS,
    EVENT_HIT_VIEWER_BATTLES,
    EVENT_HIT_VIEWER_OPEN,
    EVENT_MODS_LIST_ALERT,
    EVENT_REPLAY_UPLOAD_REQUEST,
    EVENT_REPLAY_UPLOADED,
    EVENT_SETTINGS_CLOSE,
)

__all__ = (
    'EVENT_BATTLE_NOTICE_LINES',
    'EVENT_COMPONENT_SETTINGS',
    'EVENT_HIT_VIEWER_BATTLES',
    'EVENT_HIT_VIEWER_OPEN',
    'EVENT_MODS_LIST_ALERT',
    'EVENT_REPLAY_UPLOAD_REQUEST',
    'EVENT_REPLAY_UPLOADED',
    'EVENT_SETTINGS_CLOSE',
    'EventBus',
    'battle_notice_lines',
    'hit_viewer_battles',
)


# A blinker signal whose receivers keep their connection order (2.7's dict does not).
class OrderedSignal(NamedSignal):

    def __init__(self, name, doc=None):
        NamedSignal.__init__(self, name, doc)
        self.receivers = OrderedDict()


class Signals(Namespace):

    def signal(self, name, doc=None):
        try:
            return self[name]
        except KeyError:
            return self.setdefault(name, OrderedSignal(name, doc))


class EventBus(object):
    """Named events with handlers called in subscription order."""

    def __init__(self, on_error=None):
        self.signals = Signals()
        self._on_error = on_error or log_exception

    def signal(self, name):
        return self.signals.signal(name)

    def on(self, name, handler):
        """Subscribe `handler(*args, **kwargs)` to `name`; subscribing the same handler twice is a no-op."""
        return self.signal(name).connect(handler, weak=False)

    def off(self, name, handler):
        if name in self.signals:
            self.signals[name].disconnect(handler)

    def emit(self, name, *args, **kwargs):
        signal = self.signals.get(name)
        if signal is None:
            return
        for handler in list(signal.receivers.values()):
            try:
                handler(*args, **kwargs)
            except Exception:
                self._on_error('%s handler' % name)


def hit_viewer_battles(bus):
    """The battle ids (text) the hit viewer can open now; empty without it."""
    answers = []
    bus.emit(EVENT_HIT_VIEWER_BATTLES, answers.append)
    return frozenset(answers[0]) if answers else frozenset()


def battle_notice_lines(bus, arena_id):
    """The lines other packages add to the stock post-battle message of `arena_id`; empty when none answers."""
    lines = []
    bus.emit(EVENT_BATTLE_NOTICE_LINES, arena_id, lines.append)
    return [line for line in lines if line]
