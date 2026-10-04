# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.compat import is_number
from ....core.format import COLOR_MUTED, font
from .constants import DEGREES, SEPARATOR, TICK_S, VERDICT_COLORS, VERDICT_TONES, VERDICTS, VIEW_OFFSETS

# Fair play: the readout writes out the client's own shot-result resolution, the one that colours the gun marker
# (RU 1.45 gun_marker_ctrl._CrosshairShotResults): the armour of the visible vehicle under the own reticle at the aim
# point, at the angle the own shell meets it, against the own shell's piercing power at that distance. Nothing about
# vehicles elsewhere, nothing hidden (modules, crew, reload) and no other point of the target is ever read.


def _round(value):
    return int(round(value)) if is_number(value) and not isinstance(value, bool) else None


def _angle(cos):
    if not is_number(cos):
        return None
    return int(round(math.degrees(math.acos(max(-1.0, min(1.0, cos))))))


# RU 1.45 client source: Vehicle.publicInfo is a PyFixedDictDataInstance (entity_defs PUBLIC_VEHICLE_INFO), which has
# item access but no `.get`.
def public_team(public_info):
    if public_info is None:
        return None
    try:
        return public_info['team']
    except (KeyError, TypeError):
        return None


def armor_readout(layers, piercing, verdict):
    """The numbers of one resolution: `layers` are the armour plates the own shell's ray meets, in its order, each
    `{'armor': nominal mm, 'effective': mm at the angle, after the shell's normalisation, 'damaging': the plate
    damages the vehicle (a hull or turret plate; screens, tracks and the gun do not), 'ricochet': the shell bounces
    off it, 'angle_cos': the hit angle's cosine}`; `piercing` the own shell's piercing power at the target's distance;
    `verdict` the stock shot result's name. None without a verdict or plates."""
    if verdict not in VERDICTS or not layers:
        return None
    effective = 0.0
    nominal = None
    angle_cos = None
    ricochet = False
    for layer in layers:
        nominal = layer.get('armor')
        angle_cos = layer.get('angle_cos')
        if layer.get('ricochet'):
            ricochet = True
            break
        effective += layer.get('effective') or 0.0
        if layer.get('damaging'):
            break
    return {
        'effective': _round(effective),
        'nominal': _round(nominal),
        'piercing': _round(piercing),
        'angle': _angle(angle_cos),
        'verdict': verdict,
        'ricochet': ricochet,
    }


def verdict_tone(readout):
    return VERDICT_TONES[readout['verdict']]


def server_tick(now):
    """The server tick `now` (game seconds) falls in; None without a clock."""
    return int(now / TICK_S) if is_number(now) else None


class TickGate(object):
    """Lets one resolution through per server tick: the rotator (and the responsive reticle every frame) resolves
    the shot more often than the readout needs."""

    def __init__(self):
        self.tick = None

    def allow(self, now):
        tick = server_tick(now)
        if tick is not None and tick == self.tick:
            return False
        self.tick = tick
        return True

    def clear(self):
        self.tick = None


def view_offset(view, settings):
    key = VIEW_OFFSETS.get(view)
    return settings.get(key) if key is not None else None


# The panel is centre-aligned, so its x/y is the reticle's scaled position (CrosshairDataProxy.getScaledPosition,
# RU 1.45) relative to the screen centre, `offset` design px under it.
def reticle_place(position, size, scale, offset):
    width, height = size
    factor = max(scale, 1.0)
    reticle_x, reticle_y = position
    return reticle_x - int(0.5 * width / factor), reticle_y - int(0.5 * height / factor) + offset


def armor_value(readout, translate):
    """The main number: the effective armour, or the ricochet word."""
    if readout['ricochet']:
        return translate('aim_info_ricochet')
    return u'%d' % readout['effective']


def armor_parts(readout, settings, translate):
    """(text, is_main) parts of the readout in order: the effective armour (or ricochet), the nominal armour, the
    own shell's piercing power, the hit angle, each behind its switch."""
    parts = [(armor_value(readout, translate), True)]
    if settings.get('show_nominal') and readout['nominal'] is not None:
        parts.append((translate('aim_info_nominal_value', value=readout['nominal']), False))
    if settings.get('show_piercing') and readout['piercing'] is not None:
        parts.append((translate('aim_info_piercing_value', value=readout['piercing']), False))
    if settings.get('show_angle') and readout['angle'] is not None:
        parts.append((DEGREES % readout['angle'], False))
    return parts


def format_armor(readout, settings, translate):
    """The GUIFlash text of the readout: the main number in the verdict's colour, the rest muted."""
    if readout is None:
        return None
    size = settings.get('font_size')
    color = VERDICT_COLORS[verdict_tone(readout)]
    parts = armor_parts(readout, settings, translate)
    return SEPARATOR.join(font(text, color if is_main else COLOR_MUTED, size) for text, is_main in parts)
