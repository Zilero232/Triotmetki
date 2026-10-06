"""The settings files' saves on the game thread: `deferred(store)` puts a file's writes off to one write per
SAVE_DELAY_S (a HUD edit or a wheel turn in battle writes on every step), `held_for_hangar(store)` keeps them until the
hangar (a hit book of megabytes is never encoded in a battle or at its end). `flush_writes()` writes the timed files at
once (on entering and leaving a battle), `flush_all_writes()` the held ones too (the app host calls it on the hangar,
on a disconnect and from the entry script's `fini()` when the client closes; the settings window on a profile load
and when it closes)."""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ...log import safe
from ...storage import DeferredFile, flush_pending
from .constants import SAVE_DELAY_S


def _schedule(delay_s, callback):
    BigWorld.callback(delay_s, safe(callback))


def deferred(store):
    return DeferredFile(store, _schedule, SAVE_DELAY_S)


def held_for_hangar(store):
    return DeferredFile(store)


@safe
def flush_writes(*args):
    flush_pending(held=False)


@safe
def flush_all_writes(*args):
    flush_pending(held=True)
