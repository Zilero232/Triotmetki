# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import fraction, is_int
from ....core.hud.stock import (
    RETICLE_CASSETTE,
    RETICLE_CONDITION,
    RETICLE_RELOAD,
    RETICLE_RELOAD_TIMER,
    RETICLE_ZOOM,
)
from .constants import (
    AUTOLOADER_DRUM_STYLE,
    COUNTING_STATES,
    DRUM_OFF,
    FINAL_S,
    MAX_CLIP_SIZE,
    NO_RELOAD_VALUE,
    NO_SHELLS,
    READOUT_SWITCHES,
    READY_HOLD_S,
    READY_KEY,
    RELOAD_EMPTY,
    RELOAD_FINAL,
    RELOAD_LOADED,
    RELOAD_READY,
    RELOAD_RELOADING,
    SHELL_ICONS,
)

# Fair play: the own vehicle only; updates are dropped while the camera follows an ally.


def _seconds(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _ratio(part, whole):
    if part is None or not whole:
        return None
    return round(fraction(float(part) / whole), 3)


def _tenths(seconds):
    return u'%.1f' % (math.ceil(round(seconds * 10, 6)) / 10.0)


# RU 1.45 ammo_ctrl.ReloadingTimeSnapshot: getActualValue() at the last set, getTimeLeft() now.
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
        self.autoloader = False
        self.drum_base = None
        self.interval = None
        self.last_shots = 1
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

    # ammo_ctrl gives no current shell or SHELL_QUANTITY_UNKNOWN (-1) right after a setup or shell change.
    def set_clip(self, size, loaded, shell=None, gold=False):
        if not size or size < 2:
            changed = self.clip is not None
            self.clip = None
            return changed
        size = min(size, MAX_CLIP_SIZE)
        if loaded is None or loaded < 0:
            return self._keep_clip(size)
        clip = (size, min(loaded, size))
        shell = shell if shell in SHELL_ICONS else None
        changed = (clip, shell, bool(gold)) != (self.clip, self.shell, self.gold)
        self.clip, self.shell, self.gold = clip, shell, bool(gold)
        return changed

    def _keep_clip(self, size):
        if self.clip is None or self.clip[0] == size:
            return False
        self.clip = None
        return True

    # RU 1.45 ammo_ctrl GunSettings.hasAutoReload: the autoloader indicator carries its own timer.
    def set_autoloader(self, is_autoloader):
        self.autoloader = bool(is_autoloader)

    # RU 1.45 ammo_ctrl GunSettings.getClipInterval, getLastAmmoCount.
    def set_interval(self, seconds, last_shots=1):
        seconds = _seconds(seconds)
        self.interval = seconds if seconds is not None and seconds > 0 else None
        self.last_shots = last_shots if is_int(last_shots) and last_shots > 0 else 1

    # ammo_ctrl.getShellChangeTime: the whole magazine's reload, or the first shell's on an auto-reloader.
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

    # RU 1.45 ammo_ctrl.setGunReloadTime: the interval cut, read from the magazine, not the snapshot's base.
    def loaded_reload(self):
        if self.clip is None or self.interval is None:
            return self.reload_base
        loaded = self.clip[1]
        if loaded > self.last_shots or (self.autoloader and loaded > 0):
            return self.interval
        return self.drum_base or self.reload_base

    # RU 1.45 ammo_ctrl.setGunReloadTime cuts to the interval when the shells arrive after the reload.
    def counting_base(self):
        base = self.reload_base
        if base is None or not self.is_reloading() or base >= self.reload_left:
            return base
        if self.drum_base and self.drum_base >= self.reload_left:
            return self.drum_base
        return self.reload_left

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
            return RELOAD_EMPTY
        if self.is_reloading():
            return RELOAD_FINAL if self.reload_left < FINAL_S else RELOAD_RELOADING
        if self.ready_left > 0:
            return RELOAD_READY
        if self.reload_left is not None and self.loaded_reload():
            return RELOAD_LOADED
        return None

    def reload_progress(self):
        if self.reload_left is None:
            return None
        if not self.is_reloading():
            return 0.0 if self.reload_left == NO_SHELLS else 1.0
        base = self.counting_base()
        if not base:
            return 0.0
        return round(1.0 - _ratio(self.reload_left, base), 3)

    def health_progress(self):
        return _ratio(self.health, self.max_health)


def _empty_value(readouts, translate):
    return NO_RELOAD_VALUE


def _ready_value(readouts, translate):
    return translate(READY_KEY)


def _loaded_value(readouts, translate):
    return _tenths(readouts.loaded_reload())


def _counted_value(readouts, translate):
    return _tenths(readouts.reload_left)


RELOAD_VALUES = {RELOAD_EMPTY: _empty_value, RELOAD_READY: _ready_value, RELOAD_LOADED: _loaded_value}


def _reload_value(readouts, state, translate):
    value = RELOAD_VALUES.get(state, _counted_value)
    return value(readouts, translate)


def _refill(readouts):
    if readouts.auto_left is None or readouts.clip[1] >= readouts.clip[0]:
        return None
    left = _ratio(readouts.auto_left, readouts.auto_base)
    return {'value': _tenths(readouts.auto_left), 'progress': None if left is None else round(1.0 - left, 3)}


def _clip(readouts, style):
    if style == DRUM_OFF and readouts.autoloader:
        style = AUTOLOADER_DRUM_STYLE
    if readouts.clip is None or style == DRUM_OFF:
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


def _full(readouts, value, is_counting, clip):
    refill = None if clip is None else clip['refill']
    if refill is not None and readouts.auto_base:
        full = _tenths(readouts.auto_base)
    elif clip is not None and readouts.drum_base:
        full = _tenths(readouts.drum_base)
    elif is_counting and readouts.counting_base():
        full = _tenths(readouts.counting_base())
    else:
        return None
    return None if full == value else full


def _reload_box(readouts, settings, translate):
    state = readouts.reload_state()
    if state is None:
        return None

    has_timer = bool(settings.get('reload_box'))
    clip = _clip(readouts, settings.get('drum_style'))
    if not has_timer and clip is None:
        return None

    value = _reload_value(readouts, state, translate)
    # An auto-reloader refills the shell the box already counts down: one timer, not two.
    if clip is not None and clip['refill'] is not None and clip['refill']['value'] == value:
        clip['refill']['value'] = None
    return {
        'timer': has_timer,
        'value': value,
        'full': _full(readouts, value, state in COUNTING_STATES, clip),
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
        'reload': _reload_box(readouts, settings, translate),
        'arcs': _arcs(readouts) if settings.get('reload_arcs') else None,
        'zoom': _zoom(readouts) if settings.get('show_zoom') else None,
    }
    if all(value is None for value in data.values()):
        return None
    return data


def readouts_text(data):
    reload_box = None if data is None else data['reload']
    if reload_box is None or not reload_box['timer']:
        return ''
    return reload_box['value']


def wants_readouts(settings):
    wants_drum = settings.get('drum_style') != DRUM_OFF
    return wants_drum or any(settings.get(key) for key in READOUT_SWITCHES)


def replaced_reticle_parts(drawn):
    if drawn is None:
        return ()
    parts = []
    reload_box, arcs = drawn.get('reload'), drawn.get('arcs')
    if reload_box is not None and reload_box.get('timer'):
        parts.append(RETICLE_RELOAD_TIMER)
    if reload_box is not None and reload_box.get('clip') is not None:
        parts.append(RETICLE_CASSETTE)
    if arcs is not None and arcs.get('reload') is not None:
        parts.append(RETICLE_RELOAD)
    if arcs is not None and arcs.get('health') is not None:
        parts.append(RETICLE_CONDITION)
    if drawn.get('zoom') is not None:
        parts.append(RETICLE_ZOOM)
    return tuple(parts)
