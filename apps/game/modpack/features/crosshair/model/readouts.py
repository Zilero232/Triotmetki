# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.hud.stock import (
    RETICLE_CASSETTE,
    RETICLE_CONDITION,
    RETICLE_RELOAD,
    RETICLE_RELOAD_TIMER,
    RETICLE_ZOOM,
)
from .constants import FINAL_S, MAX_CLIP_SIZE, NO_SHELLS, READY_HOLD_S, SHELL_ICONS

# Fair play: the own vehicle only. The reload and the magazine are the own gun's (the stock reticle's reload indicator
# reads the same ammo controller), the HP is the own damage panel's (VEHICLE_VIEW_STATE.HEALTH); nothing here reads
# another vehicle, and the client glue drops every update while the camera follows an ally. The magazine is the own
# gun's too (ammo_ctrl getCurrentShells, the auto-reload snapshot, the shell change time) and the zoom the own sniper
# camera's (CrosshairDataProxy.getZoomFactor). The repair timers of the own modules are left out: the stock damage
# panel shows them.


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
        self.shell = None
        self.gold = False
        self.drum_base = None
        self.auto_left = None
        self.auto_base = None
        self.health = None
        self.max_health = None
        self.zoom = None

    def set_reload(self, left, base):
        left, base = _seconds(left), _seconds(base)
        if left is None:
            return False
        was_reloading = self.is_reloading()
        self.reload_left = NO_SHELLS if left < 0 else left
        self.reload_base = base if base is not None and base > 0 else None
        self.ready_left = READY_HOLD_S if was_reloading and self.reload_left == 0 else 0.0
        return True

    def set_clip(self, size, loaded, shell=None, gold=False):
        if not size or size < 2 or loaded is None or loaded < 0:
            changed = self.clip is not None
            self.clip = None
            return changed
        size = min(size, MAX_CLIP_SIZE)
        clip = (size, min(loaded, size))
        shell = shell if shell in SHELL_ICONS else None
        changed = (clip, shell, bool(gold)) != (self.clip, self.shell, self.gold)
        self.clip, self.shell, self.gold = clip, shell, bool(gold)
        return changed

    # ammo_ctrl.getShellChangeTime: the whole magazine's reload (the gun reload before the client cuts it to the
    # interval between shells), the first shell's auto-reload on an auto-reloader.
    def set_drum_reload(self, seconds):
        seconds = _seconds(seconds)
        self.drum_base = seconds if seconds is not None and seconds > 0 else None

    def set_auto_reload(self, left, base):
        left, base = _seconds(left), _seconds(base)
        self.auto_left = left if left is not None and left > 0 else None
        self.auto_base = base if base is not None and base > 0 else None

    def set_zoom(self, factor):
        factor = _seconds(factor)
        zoom = factor if factor is not None and factor > 1 else None
        changed = zoom != self.zoom
        self.zoom = zoom
        return changed

    def set_health(self, health, max_health=None):
        if max_health:
            self.max_health = max_health
        if health is None:
            return False
        self.health = max(0, health)
        return True

    def is_counting(self):
        return self.is_reloading() or self.ready_left > 0 or self.auto_left is not None

    def is_reloading(self):
        return self.reload_left is not None and self.reload_left > 0

    def tick(self, elapsed):
        self._tick_reload(elapsed)
        if self.auto_left is not None:
            self.auto_left = max(0.0, self.auto_left - elapsed) or None
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


def _refill(readouts):
    if readouts.auto_left is None or readouts.clip[1] >= readouts.clip[0]:
        return None
    left = _ratio(readouts.auto_left, readouts.auto_base)
    return {'value': _tenths(readouts.auto_left), 'progress': None if left is None else round(1.0 - left, 3)}


def _clip(readouts, style):
    if readouts.clip is None or style == 'off':
        return None
    size, loaded = readouts.clip
    return {
        'style': style,
        'size': size,
        'loaded': loaded,
        'shell': readouts.shell,
        'gold': readouts.gold,
        'refill': _refill(readouts),
    }


# Under the value: the whole magazine's reload for a magazine gun (the value counts the next shell), else the full
# time of the reload being counted; never the same figure twice.
def _full(readouts, value, is_counting, clip):
    if clip is not None and readouts.drum_base:
        full = _tenths(readouts.drum_base)
    elif is_counting and readouts.reload_base:
        full = _tenths(readouts.reload_base)
    else:
        return None
    return None if full == value else full


def _reload_box(readouts, settings, translate):
    state = readouts.reload_state()
    if state is None:
        return None
    value = _reload_value(readouts, state, translate)
    clip = _clip(readouts, settings.get('drum_style'))
    return {
        'value': value,
        'full': _full(readouts, value, state in ('reloading', 'final'), clip),
        'state': state,
        'clip': clip,
    }


def _arcs(readouts):
    reload_part, health = readouts.reload_progress(), readouts.health_progress()
    if reload_part is None and health is None:
        return None
    return {'reload': reload_part, 'health': health}


def _zoom(readouts):
    return None if readouts.zoom is None else u'%.1f' % readouts.zoom


def readouts_data(readouts, settings, translate):
    if readouts is None:
        return None
    data = {
        'reload': _reload_box(readouts, settings, translate) if settings.get('reload_box') else None,
        'arcs': _arcs(readouts) if settings.get('reload_arcs') else None,
        'zoom': _zoom(readouts) if settings.get('show_zoom') else None,
    }
    if all(value is None for value in data.values()):
        return None
    return data


def readouts_text(data):
    if data is None or data['reload'] is None:
        return ''
    return data['reload']['value']


def wants_readouts(settings):
    return any(settings.get(key) for key in ('reload_box', 'reload_arcs', 'show_zoom'))


# The stock reticle parts the readouts stand in for, read from what was drawn (`readouts_data` of the payload the page
# got), so the player never sees both and never neither: the reload box the stock reload timer, and the stock magazine
# indicator while the box shows the magazine; each arc the stock indicator of its value, the zoom the stock zoom
# indicator. A box or an arc with nothing to show replaces nothing.
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
    if drawn.get('zoom') is not None:
        parts.append(RETICLE_ZOOM)
    return tuple(parts)
