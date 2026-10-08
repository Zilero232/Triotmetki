from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import glyph, image
from ....core.hud.widget import widget
from .constants import (
    MEDAL_GLYPH,
    MEDAL_IMAGE,
    PROGRESS_DIGITS,
    REACHED_GLYPH,
    REACHED_IMAGE,
    WIDGET_KIND,
    WN8_GLYPH,
)


def _bar(progress):
    if progress is None:
        return None
    return round(progress, PROGRESS_DIGITS)


def _main_gun(row):
    shown = dict(row['medal'])
    shown['icon'] = image(MEDAL_IMAGE, MEDAL_GLYPH)
    shown['reached_icon'] = image(REACHED_IMAGE, REACHED_GLYPH)
    shown['progress'] = _bar(row['progress'])
    shown['detail'] = row['detail']
    return shown


def _wn8(row):
    return {
        'icon': glyph(WN8_GLYPH),
        'label': row['text'],
        'value': row['value'],
        'color': row['color'],
        'note': row['note'],
    }


SECTION_BUILDERS = {'main_gun': _main_gun, 'wn8': _wn8}


def panel_widget(rows):
    if not rows:
        return None

    sections = {kind: None for kind in SECTION_BUILDERS}
    for row in rows:
        sections[row['kind']] = SECTION_BUILDERS[row['kind']](row)

    return widget(WIDGET_KIND, sections)
