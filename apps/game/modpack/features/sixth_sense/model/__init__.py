from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ....core.format import font
from .constants import (
    DIM_SUFFIX,
    ENDED,
    GALLERY_ICON_SIZE,
    ICON_RENDITIONS,
    ICON_ROOT,
    IMAGE_SCHEME,
    LAMP_DURATION_S,
    MIN_TIMER_FONT_SIZE,
    OBSERVED,
    PULSE_PERIOD_S,
    TIMER_FONT_DECREASE,
)

# Fair play: follows the client's own sixth-sense lamp (the player's vehicle is spotted); nothing else.


def lamp_duration(hide_after_s, own_spotting_decrease):
    if hide_after_s > 0:
        return float(hide_after_s)

    return max(0.0, LAMP_DURATION_S - (own_spotting_decrease or 0.0))


class SixthSense(object):

    def __init__(self):
        self.lit_at = None
        self.duration = LAMP_DURATION_S
        self.over = False

    @property
    def lit(self):
        return self.lit_at is not None

    def observed(self, is_observed, now, duration=LAMP_DURATION_S):
        if is_observed:
            return self._light(now, duration)
        if not self.lit:
            return None

        self.lit_at = None
        return 'hide'

    def _light(self, now, duration):
        if self.lit or self.over:
            return None

        self.lit_at = now
        self.duration = duration
        return 'show'

    def vehicle_state(self, state, value, now, duration=LAMP_DURATION_S):
        if state == ENDED:
            self.reset()
            return 'hide'
        if state == OBSERVED:
            return self.observed(bool(value), now, duration)
        return None

    def reset(self):
        self.lit_at = None

    def finish(self):
        self.over = True
        self.reset()

    def seconds_left(self, now):
        if not self.lit:
            return None

        return max(0.0, self.duration - (now - self.lit_at))

    def countdown(self, now):
        seconds_left = self.seconds_left(now)
        if seconds_left is None:
            return None

        return int(math.ceil(seconds_left))

    def expired(self, now):
        if not self.lit:
            return False

        return now - self.lit_at >= self.duration

    def dimmed(self, now):
        if not self.lit:
            return False

        pulse_frame = int(max(0, now - self.lit_at) / PULSE_PERIOD_S)
        return pulse_frame % 2 == 1


def icon_html(path, size):
    return '<img src="img://%s" width="%d" height="%d"/>' % (path, size, size)


def rendition(size):
    for candidate in ICON_RENDITIONS:
        if size <= candidate:
            return candidate
    return ICON_RENDITIONS[-1]


def set_icon_path(icon_set, size, dimmed=False):
    suffix = DIM_SUFFIX if dimmed else ''
    return '%s/%s%s_%d.png' % (ICON_ROOT, icon_set, suffix, rendition(size))


def icon_path(settings, dimmed=False):
    return set_icon_path(settings.get('icon_set'), settings.get('icon_size'), dimmed and settings.get('pulse'))


def gallery_picture(icon_set):
    return IMAGE_SCHEME + set_icon_path(icon_set, GALLERY_ICON_SIZE)


def icon_gallery(icon_sets):
    return {'icon_set': dict((icon_set, gallery_picture(icon_set)) for icon_set in icon_sets)}


def timer_line(state, settings, translate, now):
    seconds = state.countdown(now)
    if not settings.get('show_timer') or seconds is None:
        return None

    size = max(MIN_TIMER_FONT_SIZE, settings.get('font_size') - TIMER_FONT_DECREASE)
    return font(translate('sixth_sense_timer', seconds=seconds), settings.get('color'), size)


def format_sixth_sense(state, settings, translate, now):
    text = settings.get('text')
    timer = timer_line(state, settings, translate, now)

    parts = [icon_html(icon_path(settings, state.dimmed(now)), settings.get('icon_size'))]
    if text:
        parts.append(font(text, settings.get('color'), settings.get('font_size')))
    if timer:
        parts.append(timer)
    return '\n'.join(parts)
