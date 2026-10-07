from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec
from ....core.hud.icons import image
from ..settings import PANEL_ID
from . import mark_image
from .constants import EDITOR_GALLERY_KEY, EDITOR_GROUPS, EDITOR_SWATCH_KEY, MARK_FILES, MARK_SWATCHES, THUMB_SIZE


def _thumbs(settings):
    color, outline = settings.get('mark_color'), settings.get('mark_outline')
    return {mark: image(mark_image(mark, THUMB_SIZE, color, outline)) for mark in MARK_FILES}


def editor(settings, translate):
    icons = {EDITOR_GALLERY_KEY: _thumbs(settings)}
    swatches = {EDITOR_SWATCH_KEY: dict(MARK_SWATCHES)}
    return editor_spec(PANEL_ID, EDITOR_GROUPS, translate, icons=icons, swatches=swatches)
