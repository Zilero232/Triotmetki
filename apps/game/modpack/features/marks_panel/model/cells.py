from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import CELL_DECIMAL, CELL_PERCENT, CELL_PERCENT_DIGITS


def cell(label, value, note=None, tone='text', color=None):
    return {'label': label, 'value': value, 'note': note, 'tone': tone, 'color': color}


# A percent as the HUD page writes its own (the battle panel's `86,30 %`), so the card's numbers read alike.
def cell_percent(value, signed=False):
    rounded = round(value, 2)
    text = (CELL_PERCENT_DIGITS % abs(rounded)).replace(u'.', CELL_DECIMAL) + CELL_PERCENT
    if rounded < 0:
        return u'-' + text
    return u'+' + text if signed and rounded > 0 else text
