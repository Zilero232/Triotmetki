# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import format_number
from ....core.hud.icons import glyph
from ....core.hud.widget import card, card_chip, card_row
from . import counts, shown_missions
from .constants import CARD_WIDTH, STATUS_OF


def mission_row(mission, settings):
    detail = mission['main'] if settings.get('show_conditions') else None
    return card_row(mission['name'], status=STATUS_OF[mission['state']], detail=detail)


def hangar_widget(missions, settings, translate, totals=None):
    if not missions:
        return None
    totals = totals or counts(missions)
    rows = [mission_row(mission, settings) for mission in shown_missions(missions, settings)]
    if not rows:
        rows = [card_row(translate('pm_none_active'), status='idle', text_tone='muted')]
    chips = [
        card_chip(format_number(totals['active']), glyph('dot'), 'accent', translate('pm_chip_active')),
        card_chip(format_number(totals['done']), glyph('check'), 'success', translate('pm_chip_done')),
        card_chip(format_number(totals['honors']), glyph('check_double'), 'gold', translate('pm_chip_honors')),
    ]
    return card(translate('pm_card_title'), glyph('mission'), rows, chips=chips, width=CARD_WIDTH)
