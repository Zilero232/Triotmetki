from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec
from ..settings import COLORS, ICON_SETS, PANEL_ID
from . import icon_gallery
from .constants import EDITOR_GROUPS


def editor(settings, translate):
    return editor_spec(
        PANEL_ID,
        EDITOR_GROUPS,
        translate,
        icons=icon_gallery(ICON_SETS),
        swatches={'color': dict((color, color) for color in COLORS)},
    )
