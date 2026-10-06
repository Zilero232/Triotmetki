from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec, sample
from ....core.hud.icons import image
from ..settings import CIRCLE_PANEL_ID, PANEL_ID
from . import mark_image
from .constants import (
    CIRCLE_CHOSEN,
    CIRCLE_EDITOR_GROUPS,
    CIRCLE_STOCK,
    EDITOR_GALLERY_KEY,
    EDITOR_GROUPS,
    EDITOR_SWATCH_KEY,
    MARK_FILES,
    MARK_SWATCHES,
    THUMB_SIZE,
)
from .widget import circle_widget


def _thumbs(settings):
    color, outline = settings.get('mark_color'), settings.get('mark_outline')
    return {mark: image(mark_image(mark, THUMB_SIZE, color, outline)) for mark in MARK_FILES}


def editor(settings, translate):
    icons = {EDITOR_GALLERY_KEY: _thumbs(settings)}
    swatches = {EDITOR_SWATCH_KEY: dict(MARK_SWATCHES)}
    return editor_spec(PANEL_ID, EDITOR_GROUPS, translate, icons=icons, swatches=swatches)


# The smaller aim circle's page: the game's circle beside the chosen size, so the player sees how much smaller it gets.
def circle_editor(settings, translate):
    samples = (
        sample(CIRCLE_PANEL_ID, CIRCLE_STOCK, circle_widget(CIRCLE_STOCK), translate),
        sample(CIRCLE_PANEL_ID, CIRCLE_CHOSEN, circle_widget(settings.get('size')), translate),
    )
    return editor_spec(CIRCLE_PANEL_ID, CIRCLE_EDITOR_GROUPS, translate, samples=samples)
