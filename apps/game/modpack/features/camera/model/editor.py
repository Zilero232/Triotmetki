from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec
from .. import FEATURE_ID
from .constants import EDITOR_GROUPS, SCHEMATIC


def editor(settings, translate):
    return editor_spec(FEATURE_ID, EDITOR_GROUPS, translate, schematic=SCHEMATIC)
