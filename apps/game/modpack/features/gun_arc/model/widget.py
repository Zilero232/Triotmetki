from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.widget import widget
from .constants import KIND, MARK_NAMES


def _mark(offset):
    if offset is None:
        return None
    return {'x': offset[0], 'y': offset[1]}


def panel_widget(marks, settings):
    if not marks or not any(marks.get(name) for name in MARK_NAMES):
        return None
    centre_marker = settings.get('centre_marker')
    return widget(KIND, {
        'marker': settings.get('marker'),
        'centre_marker': centre_marker,
        'left': _mark(marks.get('left')),
        'right': _mark(marks.get('right')),
        'centre': _mark(marks.get('centre')) if centre_marker != 'none' else None,
    })
