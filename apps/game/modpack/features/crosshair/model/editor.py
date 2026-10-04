from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import image
from . import mark_image
from .constants import EDITOR_GALLERY_KEY, EDITOR_GROUPS, EDITOR_SWATCH_KEY, MARK_FILES, MARK_SWATCHES, THUMB_SIZE


def _thumbs(settings):
    color, outline = settings.get('mark_color'), settings.get('mark_outline')
    return {mark: image(mark_image(mark, THUMB_SIZE, color, outline)) for mark in MARK_FILES}


def editor(settings, translate):
    return {
        'groups': [
            {'id': group, 'label': translate('crosshair_group_%s' % group), 'keys': list(keys)}
            for group, keys in EDITOR_GROUPS
        ],
        'icons': {EDITOR_GALLERY_KEY: _thumbs(settings)},
        'swatches': {EDITOR_SWATCH_KEY: dict(MARK_SWATCHES)},
    }
