# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.hud.stock import RETICLE_CASSETTE, RETICLE_CONDITION, RETICLE_RELOAD, RETICLE_RELOAD_TIMER
from .constants import FINAL_S, MAX_CLIP_CELLS, NO_SHELLS, READY_HOLD_S

# Fair play: the own vehicle only. The reload and the magazine are the own gun's (the stock reticle's reload indicator
# reads the same ammo controller), the HP is the own damage panel's (VEHICLE_VIEW_STATE.HEALTH); nothing here reads
# another vehicle, and the client glue drops every update while the camera follows an ally. The repair timers of the
# own modules are left out: the stock damage panel shows them.


def _seconds(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _ratio(part, whole):
    if part is None or not whole:
        return None
    return round(max(0.0, min(1.0, float(part) / whole)), 3)


def _tenths(seconds):
    return u'%.1f' % (math.ceil(round(seconds * 10, 6)) / 10.0)


# RU 1.45 ammo_ctrl.ReloadingTimeSnapshot: getActualValue() is the time left when the client last set it, getTimeLeft()
# the time left now; a snapshot read later than its update (the one taken when the readouts start) counts from now.
# A finished reload (0) and the client's "no shells" (-1) are kept as they are.
def reload_left(actual, time_left):
    actual = _seconds(actual)
    if actual is None or actual <= 0 or _seconds(time_left) is None:
        return actual
    return _seconds(time_left)


class Readouts(object):

    def __init__(self):
        self.reload_left = None
        self.reload_base = None
        self.ready_left = 0.0
        self.clip = None
        self.health = None
        self.max_health = None

    def set_reload(self, left, base):
        left, base = _seconds(left), _seconds(base)
        if left is None:
            return False
        was_reloading = self.is_reloading()
        self.reload_left = NO_SHELLS if left < 0 else left
        self.reload_base = base if base is not None and base > 0 else None
        self.ready_left = READY_HOLD_S if was_reloading and self.reload_left == 0 else 0.0
        return True

    def set_clip(self, size, loaded):
        if not size or size < 2 or loaded is None or loaded < 0:
            changed = self.clip is not None
            self.clip = None
            return changed
        clip = (min(size, MAX_CLIP_CELLS), min(loaded, size, MAX_CLIP_CELLS))
        changed = clip != self.clip
        self.clip = clip
        return changed

    def set_health(self, health, max_health=None):
        if max_health:
            self.max_health = max_health
        if health is None:
            return False
        self.health = max(0, health)
        return True

    def is_counting(self):
        return self.is_reloading() or self.ready_left > 0

    def is_reloading(self):
        return self.reload_left is not None and self.reload_left > 0

    def tick(self, elapsed):
        self._tick_reload(elapsed)
        return self.is_counting()

    def _tick_reload(self, elapsed):
        if self.is_reloading():
            self.reload_left = max(0.0, self.reload_left - elapsed)
            if self.reload_left == 0:
                self.ready_left = READY_HOLD_S
        elif self.ready_left > 0:
            self.ready_left = max(0.0, self.ready_left - elapsed)

    def reload_state(self):
        if self.reload_left == NO_SHELLS:
            return 'empty'
        if self.is_reloading():
            return 'final' if self.reload_left < FINAL_S else 'reloading'
        if self.ready_left > 0:
            return 'ready'
        return 'loaded' if self.reload_left is not None and self.reload_base else None

    def reload_progress(self):
        if self.reload_left is None:
            return None
        if not self.is_reloading():
            return 0.0 if self.reload_left == NO_SHELLS else 1.0
        if not self.reload_base:
            return 0.0
        return round(1.0 - _ratio(self.reload_left, self.reload_base), 3)

    def health_progress(self):
        return _ratio(self.health, self.max_health)


def _reload_value(readouts, state, translate):
    if state == 'empty':
        return u'—'
    if state == 'ready':
        return translate('crosshair_ready')
    if state == 'loaded':
        return _tenths(readouts.reload_base)
    return _tenths(readouts.reload_left)


def _reload_box(readouts, translate):
    state = readouts.reload_state()
    if state is None:
        return None
    is_counting = state in ('reloading', 'final')
    clip = readouts.clip
    return {
        'value': _reload_value(readouts, state, translate),
        'full': _tenths(readouts.reload_base) if is_counting and readouts.reload_base else None,
        'state': state,
        'clip': {'size': clip[0], 'loaded': clip[1]} if clip else None,
    }


def _arcs(readouts):
    reload_part, health = readouts.reload_progress(), readouts.health_progress()
    if reload_part is None and health is None:
        return None
    return {'reload': reload_part, 'health': health}


def readouts_data(readouts, settings, translate):
    if readouts is None:
        return None
    data = {
        'reload': _reload_box(readouts, translate) if settings.get('reload_box') else None,
        'arcs': _arcs(readouts) if settings.get('reload_arcs') else None,
    }
    if data['reload'] is None and data['arcs'] is None:
        return None
    return data


def readouts_text(data):
    if data is None or data['reload'] is None:
        return ''
    return data['reload']['value']


def wants_readouts(settings):
    return any(settings.get(key) for key in ('reload_box', 'reload_arcs'))


# The stock reticle parts the readouts stand in for, read from what was drawn (`readouts_data` of the payload the page
# got), so the player never sees both and never neither: the reload box the stock reload timer, and the stock magazine
# indicator while the box shows the magazine cells; each arc the stock indicator of its value. A box or an arc with
# nothing to show replaces nothing.
def replaced_reticle_parts(drawn):
    if drawn is None:
        return ()
    parts = []
    reload_box, arcs = drawn.get('reload'), drawn.get('arcs')
    if reload_box is not None:
        parts.append(RETICLE_RELOAD_TIMER)
        if reload_box.get('clip') is not None:
            parts.append(RETICLE_CASSETTE)
    if arcs is not None and arcs.get('reload') is not None:
        parts.append(RETICLE_RELOAD)
    if arcs is not None and arcs.get('health') is not None:
        parts.append(RETICLE_CONDITION)
    return tuple(parts)
