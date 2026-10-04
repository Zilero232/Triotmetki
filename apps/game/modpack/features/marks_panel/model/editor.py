from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec, sample
from ..settings import PANEL_ID
from .constants import EDITOR_GROUPS
from .preview import card_preview_widget


def editor(settings, translate):
    card = sample(PANEL_ID, 'card', card_preview_widget(settings, translate), translate)
    return editor_spec(PANEL_ID, EDITOR_GROUPS, translate, samples=(card,))
