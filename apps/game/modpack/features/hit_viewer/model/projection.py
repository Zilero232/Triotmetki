from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number

# The 2D marker of a 3D hit: the clip-space point (x, y, z, w) the client's view-projection matrix gives (RU 1.45
# maps_training_view.worldToScreenPos does the same for its hangar marker) as fractions of the screen, 0..1 from the
# top left; None behind the camera.
EDGE = 1.5


def to_screen(clip):
    if not isinstance(clip, (list, tuple)) or len(clip) != 4 or not all(is_number(value) for value in clip):
        return None
    x, y, _, w = clip
    if w <= 0:
        return None
    ndc_x, ndc_y = x / w, y / w
    if abs(ndc_x) > EDGE or abs(ndc_y) > EDGE:
        return None
    return round((ndc_x + 1.0) / 2.0, 4), round((1.0 - ndc_y) / 2.0, 4)


def marker(index, tone, point_clip, tail_clip):
    """The page's marker of one hit: its point and the start of its direction line, or None off the screen."""
    point = to_screen(point_clip)
    if point is None:
        return None
    tail = to_screen(tail_clip) or point
    return {'i': index, 'tone': tone, 'x': point[0], 'y': point[1], 'tx': tail[0], 'ty': tail[1]}
