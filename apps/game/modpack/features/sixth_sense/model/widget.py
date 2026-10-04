from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import image
from ....core.hud.widget import color_override, widget
from ..settings.constants import DEFAULTS
from . import icon_path
from .constants import KIND

# Fair play: follows the client's own sixth-sense lamp (the player's vehicle is spotted); nothing about the spotter.


def sixth_sense_widget(state, settings, translate, now):
    seconds_left = state.seconds_left(now) or 0.0

    return widget(KIND, {
        'icon': image(icon_path(settings), 'lamp'),
        'size': settings.get('icon_size'),
        'text': settings.get('text'),
        'color': color_override(settings.get('color'), DEFAULTS['color']),
        'elapsed': round(state.duration - seconds_left, 1),
        'duration': state.duration,
        'timer': bool(settings.get('show_timer')),
        'dim': bool(state.dimmed(now)),
    })
