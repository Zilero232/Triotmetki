from __future__ import absolute_import, division, print_function, unicode_literals

from .battle import card_text, card_widget, last_view
from .battle.constants import LAST_SHOW_S, PREVIEW_FONT_SIZE, PREVIEW_LAST


def last_sample(translate):
    sample = dict(PREVIEW_LAST)
    sample['map'] = translate(PREVIEW_LAST['map'])
    return last_view(sample, translate)


def last_preview_text(settings, translate):
    return card_text(last_sample(translate), settings.get('font_size') or PREVIEW_FONT_SIZE)


def last_preview_widget(settings, translate):
    return card_widget(last_sample(translate), LAST_SHOW_S)


preview_text = last_preview_text
preview_widget = last_preview_widget
