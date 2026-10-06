from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import class_icon, efficiency_icon, glyph, outcome_icon
from ....core.hud.widget import widget
from . import section_rows, shown_totals
from .constants import (
    ASSIST_KINDS,
    KIND,
    KIND_DAMAGE,
    KIND_RECEIVED,
    KIND_TONES,
    RECEIVED_ICONS,
    SOURCE_ICONS,
    TOTAL_ICONS,
    TOTAL_TONES,
)
from .words import row_note, shell_label

# Fair play: the player's own shots with their hit markers, damage, crits and the target's HP after the own shot (as
# its marker shows it), the own assist, and the hits on the player with the attacker's name and class as the stock
# damage log names them.

ICON_SETS = {'efficiency': efficiency_icon, 'glyph': glyph, 'outcome': outcome_icon}


def _icon_of(found):
    if found is None:
        return None

    icon_set, name = found
    return ICON_SETS[icon_set](name)


def total_icon(key):
    icon = TOTAL_ICONS[key]
    return efficiency_icon(icon) if icon else glyph('received')


def totals(log, settings):
    return [
        {'key': key, 'icon': total_icon(key), 'value': value, 'tone': TOTAL_TONES[key]}
        for key, value in shown_totals(log, settings)
    ]


def row_icon(row):
    source_icon = _icon_of(SOURCE_ICONS.get(row.get('source')))
    if source_icon is not None:
        return source_icon
    if row['kind'] in ASSIST_KINDS:
        return glyph(row['kind'])
    if row['kind'] == KIND_DAMAGE:
        return outcome_icon(row['outcome'])
    return _icon_of(RECEIVED_ICONS.get(row['outcome']))


def row_shell(row, translate):
    label = shell_label(row, translate)
    if not label:
        return None

    return {'code': row['shell'], 'label': label, 'gold': bool(row.get('gold'))}


def signed_amount(row):
    damage = row.get('damage')
    if not damage:
        return None

    return -damage if row['kind'] == KIND_RECEIVED else damage


def row_bar(row, show_hp):
    if not show_hp or row.get('hp') is None or not row.get('max'):
        return None, None

    return row['hp'], row['max']


def row_widget(row, translate, looks):
    hp, max_hp = row_bar(row, looks['show_hp'])
    return {
        'id': row['id'],
        'amount': signed_amount(row),
        'tone': KIND_TONES[row['kind']],
        'icon': row_icon(row),
        'shell': row_shell(row, translate),
        'cls': class_icon(row.get('class'), 'red'),
        'name': row.get('vehicle') or '',
        'hits': row.get('hits', 1),
        'crits': row.get('crits') or 0,
        'hp': hp,
        'max': max_hp,
        'ammo_rack': glyph('ammo_rack') if row.get('ammo_rack') else None,
        'note': row_note(row, translate, looks['show_hp']) if looks['noted'] else '',
    }


def damage_log_widget(log, settings, translate):
    rows = section_rows(log, settings)
    noted = bool(settings.get('show_notes'))
    looks = {'show_hp': settings.get('show_hp'), 'noted': noted}

    return widget(KIND, {
        'wide': noted,
        'totals': totals(log, settings),
        'dealt': [row_widget(row, translate, looks) for row in rows['dealt']],
        'received': [row_widget(row, translate, looks) for row in rows['received']],
    })
