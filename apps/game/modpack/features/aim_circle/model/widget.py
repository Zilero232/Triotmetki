from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.widget import widget
from . import circle_percent
from .constants import KIND, SAMPLE_MARK_SIZE


def circle_widget(size):
    return widget(KIND, {
        'mark': None,
        'shape': None,
        'color': None,
        'outline': False,
        'size': SAMPLE_MARK_SIZE,
        'hides_centre': False,
        'sketch': True,
        'circle': circle_percent(size),
        'readouts': None,
    })
