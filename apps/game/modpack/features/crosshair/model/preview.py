from __future__ import absolute_import, division, print_function, unicode_literals

from . import mark_text
from .constants import SAMPLE_READOUTS
from .readouts import Readouts
from .widget import crosshair_widget


def sample_readouts():
    readouts = Readouts()
    readouts.set_reload(SAMPLE_READOUTS['reload_left'], SAMPLE_READOUTS['reload_base'])
    readouts.set_clip(*SAMPLE_READOUTS['clip'])
    readouts.set_drum_reload(SAMPLE_READOUTS['drum_reload'])
    readouts.set_interval(SAMPLE_READOUTS['interval'])
    readouts.set_health(SAMPLE_READOUTS['health'], SAMPLE_READOUTS['max_health'])
    readouts.set_zoom(SAMPLE_READOUTS['zoom'])
    return readouts


def preview_text(settings, translate):
    return mark_text(settings)


def preview_widget(settings, translate):
    return crosshair_widget(settings, translate, sample_readouts())
