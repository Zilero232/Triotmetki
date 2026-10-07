# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.format import counted, format_epoch, format_number
from ....core.hit_book import DAMAGING
from .constants import ACTION_OPEN, DASH, MAP_ICON, PAGE_LABELS, SEPARATOR, SIDE_DEALT, SIDE_RECEIVED, SIDES
from .zones import zone_of


def side_hits(battle, side):
    return [(index, hit) for index, hit in enumerate(battle.get('hits') or []) if hit.get('side') == side]


def first_side(battle):
    for side in SIDES:
        if side_hits(battle, side):
            return side
    return SIDE_RECEIVED


def shell_text(hit, translate):
    if not hit.get('shell'):
        return DASH
    label = translate('hv_shell_' + hit['shell'])
    return u'%s %d' % (label, hit['caliber']) if hit.get('caliber') else label


def result_text(hit, translate):
    return translate('hv_result_' + hit['outcome'])


def _number_or_dash(value, unit=u''):
    return format_number(value) + unit if is_number(value) and value > 0 else DASH


def angle_text(hit):
    angle = hit.get('angle')
    return u'%d°' % int(round(angle)) if is_number(angle) else DASH


def zone_text(hit, translate):
    zone = zone_of(hit.get('segments'))
    return translate('hv_zone_' + zone) if zone else translate('hv_part_' + hit['part'])


def hit_row(number, index, hit, translate):
    return {
        'n': number,
        'index': index,
        'vehicle': hit.get('vehicle') or u'?',
        'class': hit.get('class'),
        'result': result_text(hit, translate),
        'part': translate('hv_part_' + hit['part']),
        'zone': zone_text(hit, translate),
        'tone': hit['outcome'],
        'shell': shell_text(hit, translate),
        'damage': _number_or_dash(hit.get('damage')) if hit['outcome'] in DAMAGING else DASH,
        'angle': angle_text(hit),
        'armor': _number_or_dash(hit.get('armor')),
        'nominal': _number_or_dash(hit.get('nominal')),
    }


def battle_title(battle, translate):
    return battle.get('map') or translate('hv_unknown_map')


def _no_image(path):
    return None


def battle_item(battle, translate, image=_no_image):
    geometry = battle.get('geometry')
    return {
        'id': battle['id'],
        'map': battle_title(battle, translate),
        'vehicle': battle.get('vehicle') or u'?',
        'date': format_epoch(battle.get('t')) or u'',
        'tier': battle.get('tier'),
        'result': battle.get('result'),
        'image': image(MAP_ICON % geometry) if geometry else None,
        'received': len(side_hits(battle, SIDE_RECEIVED)),
        'dealt': len(side_hits(battle, SIDE_DEALT)),
    }


def tab_items(battle, translate):
    return [
        {'id': side, 'label': translate('hv_tab_' + side), 'count': len(side_hits(battle, side))}
        for side in (SIDE_RECEIVED, SIDE_DEALT)
    ]


def _share(part, whole):
    return int(round(100.0 * part / whole)) if whole else None


# On the own tank the share its armour held, on the enemies the share of the own hits that penetrated.
def tab_summary(hits, tab, translate):
    damaging = [hit for _, hit in hits if hit['outcome'] in DAMAGING]
    held = len(hits) - len(damaging)
    is_received = tab == SIDE_RECEIVED
    return {
        'damage': format_number(sum(hit.get('damage') or 0 for hit in damaging)),
        'share': _share(held if is_received else len(damaging), len(hits)),
        'share_label': translate('hv_share_held' if is_received else 'hv_share_pen'),
    }


def profile_view(profile, vehicle, translate):
    if not profile or not profile['hits']:
        return None
    weak = profile['weak']
    zones = [
        dict(zone, label=translate('hv_zone_' + zone['id']), share=_share(zone['pens'], zone['hits']))
        for zone in profile['zones']
    ]
    return {
        'vehicle': vehicle or u'?',
        'meta': SEPARATOR.join([
            counted(profile['battles'], 'battles', translate),
            counted(profile['hits'], 'hits', translate),
            translate('hv_profile_held', share=_share(profile['held'], profile['hits'])),
        ]),
        'zones': zones,
        'weak': weak,
        'advice': translate('hv_advice_' + weak) if weak else None,
    }


def labels(translate):
    return {key: translate(name) for key, name in PAGE_LABELS}


def viewer_state(battles, selection, translate, stage=None, image=_no_image, profile=None):
    stage = stage or {}
    items = [battle_item(item, translate, image) for item in reversed(battles)]
    state = {'labels': labels(translate), 'battles': items}
    battle = _selected_battle(battles, selection.get('battle'))
    if battle is None:
        state.update({'battle': None, 'tabs': [], 'tab': None, 'rows': [], 'selected': None, 'summary': None,
                      'profile': None})
        return state
    tab = selection.get('tab') if selection.get('tab') in SIDES else first_side(battle)
    hits = side_hits(battle, tab)
    rows = [hit_row(number, index, hit, translate) for number, (index, hit) in enumerate(hits, 1)]
    state.update({
        'battle': battle_item(battle, translate, image),
        'tabs': tab_items(battle, translate),
        'tab': tab,
        'rows': rows,
        'selected': selection.get('index'),
        'loading': bool(stage.get('loading')),
        'approx': bool(stage.get('approx')),
        'summary': tab_summary(hits, tab, translate) if hits else None,
        'profile': profile_view(profile, battle.get('vehicle'), translate),
    })
    return state


def _selected_battle(battles, battle_id):
    for battle in battles:
        if battle['id'] == battle_id:
            return battle
    return battles[-1] if battles else None


def default_index(battle, tab):
    hits = side_hits(battle, tab)
    return hits[0][0] if hits else None


def settings_row(battle, translate):
    received = len(side_hits(battle, SIDE_RECEIVED))
    dealt = len(side_hits(battle, SIDE_DEALT))
    return {
        'id': battle['id'],
        'title': battle_title(battle, translate),
        'subtitle': SEPARATOR.join([battle.get('vehicle') or u'?', format_epoch(battle.get('t')) or u'']),
        'meta': translate('hv_row_counts', received=received, dealt=dealt),
        'badge': None,
        'actions': [{'id': ACTION_OPEN, 'label': translate('hv_open')}],
    }


def settings_page(battles, translate):
    return {
        'kind': 'list',
        'note': translate('hv_page_note'),
        'empty': translate('hv_no_battles'),
        'rows': [settings_row(battle, translate) for battle in reversed(battles)],
    }
