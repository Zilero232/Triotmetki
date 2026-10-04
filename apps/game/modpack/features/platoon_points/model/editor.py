from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec
from .constants import EDITOR_GROUPS

FEATURE = 'platoon_points'


def editor(settings, translate):
    return editor_spec(FEATURE, EDITOR_GROUPS, translate)
