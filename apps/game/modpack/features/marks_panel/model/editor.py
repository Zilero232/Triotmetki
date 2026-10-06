from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec
from ..settings import CARD_PANEL_ID, PANEL_ID
from .constants import CARD_EDITOR_GROUPS, EDITOR_GROUPS


def editor(settings, translate):
    return editor_spec(PANEL_ID, EDITOR_GROUPS, translate)


def card_editor(settings, translate):
    return editor_spec(CARD_PANEL_ID, CARD_EDITOR_GROUPS, translate)
