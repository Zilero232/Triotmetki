from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import image
from ....core.hud.widget import widget
from . import is_vector, settings_mark_image
from .circle import circle_percent
from .constants import CIRCLE_SAMPLE_MARK_SIZE, CIRCLE_STOCK, KIND, MARK_SWATCHES
from .readouts import readouts_data


# A vector mark goes as its shape, colour and outline (the Gameface page draws it pixel-snapped at its size, ui-web
# crosshair `reticle-mark`); a full-colour mark as its image. `sketch` draws the game's own reticle under it: the
# settings previews only, in battle the game draws its reticle itself. `with_mark` False leaves the mark out (a view
# the mark is not drawn in, where the readouts still are). The sketch keeps the game's circle: the smaller aim circle
# has its own page and preview (circle_widget).
def crosshair_widget(settings, translate, readouts=None, sketch=True, with_mark=True):
    mark = settings.get('mark') if with_mark else 'none'
    path = settings_mark_image(settings) if with_mark else None
    vector = is_vector(mark)
    return widget(KIND, {
        'mark': image(path) if path and not vector else None,
        'shape': mark if vector else None,
        'color': MARK_SWATCHES.get(settings.get('mark_color')) if vector else None,
        'outline': vector and bool(settings.get('mark_outline')),
        'size': settings.get('mark_size'),
        'hides_centre': bool(path) and bool(settings.get('mark_hides_centre')),
        'sketch': sketch,
        'circle': circle_percent(CIRCLE_STOCK),
        'readouts': readouts_data(readouts, settings, translate),
    })


def circle_widget(size):
    return widget(KIND, {
        'mark': None,
        'shape': None,
        'color': None,
        'outline': False,
        'size': CIRCLE_SAMPLE_MARK_SIZE,
        'hides_centre': False,
        'sketch': True,
        'circle': circle_percent(size),
        'readouts': None,
    })
