from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec
from ..settings import PANEL_ID
from .constants import EDITOR_GROUPS, PALETTES


def editor(settings, translate):
    swatches = {'palette': dict((palette, colors[0]) for palette, colors in PALETTES.items())}
    return editor_spec(PANEL_ID, EDITOR_GROUPS, translate, swatches=swatches)
