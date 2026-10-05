from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import PREVIEW_MARKS
from .widget import panel_widget


def preview_text(settings, translate):
    return translate('gun_arc_preview')


def preview_widget(settings, translate):
    return panel_widget(PREVIEW_MARKS, settings)
