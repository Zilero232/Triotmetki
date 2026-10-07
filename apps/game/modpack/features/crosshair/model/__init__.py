from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, tri_state
from .constants import (
    ARCADE,
    CENTRE_PART,
    DEFAULT_MARK_COLOR,
    MARK_COLORS,
    MARK_FILES,
    MARK_RENDITIONS,
    MARK_ROOT,
    MODE_RETICLES,
    OUTLINE_SUFFIX,
    PRESET_PARTS,
    RETIRED_MARKS,
    SERVER_RETICLE,
    SNIPER,
    VECTOR_FOLDER,
    VECTOR_RENDITIONS,
)

# Fair play: visual only, no lead, penetration, aim assist or enemy data; stock reticle art is never replaced.


def to_native(values):
    result = {}
    reticles = MODE_RETICLES.get(values.get('modes'), ())

    preset = values.get('preset')
    if preset != NATIVE and preset in PRESET_PARTS:
        for reticle in reticles:
            result[reticle] = dict(PRESET_PARTS[preset])

    has_mark = mark_image(values.get('mark'), values.get('mark_size')) is not None
    if has_mark and values.get('mark_hides_centre'):
        for reticle in reticles:
            result.setdefault(reticle, {})[CENTRE_PART] = 0

    server_reticle = tri_state(values.get('server_reticle'))
    if server_reticle is not None:
        result[SERVER_RETICLE] = server_reticle
    return result


def rendition(size, renditions=MARK_RENDITIONS):
    for candidate in renditions:
        if size <= candidate:
            return candidate
    return renditions[-1]


def is_vector(mark):
    found = MARK_FILES.get(mark)
    return found is not None and found[0] == VECTOR_FOLDER


def normalize_mark(value):
    return RETIRED_MARKS.get(value, value)


def mark_image(mark, size, color=DEFAULT_MARK_COLOR, outline=False):
    found = MARK_FILES.get(mark)
    if found is None or not size:
        return None

    folder, stem = found
    if folder != VECTOR_FOLDER:
        return '%s/%s/%s_%d.png' % (MARK_ROOT, folder, stem, rendition(size))

    if color not in MARK_COLORS:
        color = DEFAULT_MARK_COLOR
    suffix = OUTLINE_SUFFIX if outline else ''
    return '%s/%s/%s%s_%s_%d.png' % (MARK_ROOT, folder, stem, suffix, color, rendition(size, VECTOR_RENDITIONS))


def settings_mark_image(settings, size=None):
    return mark_image(
        settings.get('mark'),
        settings.get('mark_size') if size is None else size,
        settings.get('mark_color'),
        settings.get('mark_outline'),
    )


def mark_html(path, size):
    if path is None:
        return ''
    return '<img src="img://%s" width="%d" height="%d"/>' % (path, size, size)


def mark_text(settings):
    return mark_html(settings_mark_image(settings), settings.get('mark_size'))


def screen_centre(size, scale):
    width, height = size
    factor = max(scale, 1.0)
    return int(0.5 * width / factor), int(0.5 * height / factor)


# The mark sits at CrosshairDataProxy.getScaledPosition relative to the screen centre.
def mark_offset(position, size, scale, settings):
    centre_x, centre_y = screen_centre(size, scale)
    reticle_x, reticle_y = position
    return reticle_x - centre_x + settings.get('x'), reticle_y - centre_y + settings.get('y')


def shows_in(modes, is_arcade, is_sniper):
    reticles = MODE_RETICLES.get(modes, ())
    if is_arcade and ARCADE in reticles:
        return True
    return is_sniper and SNIPER in reticles
