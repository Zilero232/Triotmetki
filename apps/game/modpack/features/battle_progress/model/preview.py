from __future__ import absolute_import, division, print_function, unicode_literals

from . import progress_state
from .constants import PREVIEW_COUNTS, PREVIEW_ENEMY_HP, PREVIEW_ENEMY_MAX, PREVIEW_ROW
from .main_gun import main_gun_state
from .rows import progress_rows
from .text import format_panel
from .widget import panel_widget


def preview_rows(settings, translate):
    main_gun = main_gun_state(PREVIEW_COUNTS['damage'], PREVIEW_ENEMY_MAX, PREVIEW_ENEMY_HP)
    state = progress_state(PREVIEW_COUNTS, main_gun, PREVIEW_ROW)
    return progress_rows(state, settings, translate)


def preview_text(settings, translate):
    return format_panel(preview_rows(settings, translate), settings) or u''


def preview_widget(settings, translate):
    return panel_widget(preview_rows(settings, translate))
