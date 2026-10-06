"""The settings files' saves on the game thread: `deferred(store)` puts a file's writes off to one write per
SAVE_DELAY_S (a HUD edit or a wheel turn in battle writes on every step), `flush_writes()` writes what is held at
once (the app host calls it on a space change, at the end of a battle, on a disconnect and from the entry script's
`fini()` when the client closes)."""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ...log import safe
from ...storage import DeferredFile, flush_pending
from .constants import SAVE_DELAY_S


def _schedule(delay_s, callback):
    BigWorld.callback(delay_s, safe(callback))


def deferred(store):
    return DeferredFile(store, _schedule, SAVE_DELAY_S)


@safe
def flush_writes():
    flush_pending()

