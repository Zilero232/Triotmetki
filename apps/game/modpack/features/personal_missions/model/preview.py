from __future__ import absolute_import, division, print_function, unicode_literals

from . import clean_missions, format_hangar
from .constants import PREVIEW_MISSIONS, PREVIEW_TEXT_KEYS
from .widget import hangar_widget


def _translated(mission, translate):
    translated = dict(mission)
    for key in PREVIEW_TEXT_KEYS:
        if mission[key]:
            translated[key] = translate(mission[key])
    return translated


def preview_missions(translate):
    return clean_missions([_translated(mission, translate) for mission in PREVIEW_MISSIONS])


def preview_text(settings, translate):
    missions, totals = preview_missions(translate)
    return format_hangar(missions, settings, translate, totals) or u''


def preview_widget(settings, translate):
    missions, totals = preview_missions(translate)
    return hangar_widget(missions, settings, translate, totals)
