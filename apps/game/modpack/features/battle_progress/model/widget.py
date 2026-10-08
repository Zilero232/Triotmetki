from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import glyph, image
from ....core.hud.widget import card, card_row
from .constants import CARD_WIDTH, ROW_GLYPHS, ROW_IMAGES


def row_icon(kind):
    fallback = ROW_GLYPHS[kind]
    path = ROW_IMAGES.get(kind)
    if path is None:
        return glyph(fallback)
    return image(path, fallback)


def _card_row(row):
    return card_row(
        row['text'],
        row['value'],
        icon=row_icon(row['kind']),
        tone_name=row['tone'],
        color=row['color'],
        text_tone='muted',
        note=row['note'],
        detail=row['detail'],
        progress=row['progress'],
        progress_tone=row['progress_tone'],
    )


def panel_widget(rows):
    if not rows:
        return None
    return card(rows=[_card_row(row) for row in rows], width=CARD_WIDTH)
