from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec
from ..settings import PANEL_ID
from .constants import EDITOR_GROUPS


def editor(settings, translate):
    return editor_spec(PANEL_ID, EDITOR_GROUPS, translate)
