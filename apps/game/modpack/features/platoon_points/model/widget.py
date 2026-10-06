from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import class_icon
from ....core.hud.widget import widget
from . import rules_of
from .constants import KIND, MEMBER_KEYS


def member(row, translate):
    shown = {key: row[key] for key in MEMBER_KEYS}
    shown['cls'] = class_icon(row['class'], 'green')
    shown['frags_text'] = translate('platoon_points_frags', frags=row['frags'])
    return shown


def points_widget(platoon, settings, translate, extended=False):
    rules = rules_of(settings)
    rows = platoon.rows(rules, settings.get('show_platoon'))
    return widget(KIND, {
        'title': translate('platoon_points_title'),
        'rows': [member(row, translate) for row in rows],
        'total': sum(row['points'] for row in rows),
        'rules': rules,
        'extended': bool(extended),
    })
