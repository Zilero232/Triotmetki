# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, string_types
from .constants import MENU_ID, MORE_ID, OPTION_PREFIX, TIER_NUMERALS

# Fair play: the player's own garage only, the tanks that carry the device and nothing else.


def carriers(vehicles, current_id, show_locked):
    rows = [row for row in vehicles if row['id'] != current_id and (show_locked or not row['locked'])]
    return sorted(rows, key=lambda row: (-row['tier'], row['name']))


def tier_numeral(tier):
    if is_int(tier) and 1 <= tier <= len(TIER_NUMERALS):
        return TIER_NUMERALS[tier - 1]
    return u'?'


def option_id(vehicle_id):
    return OPTION_PREFIX + str(vehicle_id)


def vehicle_of(option):
    if not isinstance(option, string_types) or not option.startswith(OPTION_PREFIX):
        return None
    rest = option[len(OPTION_PREFIX):]
    return int(rest) if rest.isdigit() else None


def _item(row, translate):
    label = translate('quick_demount_vehicle', tier=tier_numeral(row['tier']), name=row['name'])
    return {'id': option_id(row['id']), 'label': label, 'enabled': not row['locked']}


def demount_menu(vehicles, current_id, settings, translate):
    rows = carriers(vehicles, current_id, settings.get('show_locked'))
    if not rows:
        return None
    shown = rows[:settings.get('max_vehicles')]
    items = [_item(row, translate) for row in shown]
    hidden = len(rows) - len(shown)
    if hidden:
        items.append({'id': MORE_ID, 'label': translate('quick_demount_more', count=hidden), 'enabled': False})
    return {'id': MENU_ID, 'label': translate('quick_demount_menu'), 'items': items}
