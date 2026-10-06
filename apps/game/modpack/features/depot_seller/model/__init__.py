# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import hashlib
import json

from ....core.compat import clean_text, int_or_none, to_text
from ....core.format import count_phrase, format_number
from .constants import (  # noqa: F401
    ACTION_SELL,
    CONFIRM_ITEMS,
    CREW_ROW_PREFIX,
    CREW_SWITCH,
    ITEM_ROW_PREFIX,
    KIND_SWITCHES,
    MAX_NAME,
    REFUSE_CHANGED,
    REFUSE_NOTHING,
    REFUSE_UNSET,
    SALE_TOKEN_LENGTH,
    SALE_TOKEN_SEPARATOR,
)

# Fair play: only the player's own depot and barracks. Nothing is sold without the confirmation that names the items
# and the credits; the request is the one the depot's own «Продать» sends.

KINDS = dict(KIND_SWITCHES)


def clean_item(raw):
    if not isinstance(raw, dict) or raw.get('kind') not in KINDS:
        return None
    cd = int_or_none(raw.get('cd'), 1)
    count = int_or_none(raw.get('count'), 1)
    if cd is None or count is None:
        return None
    return {
        'cd': cd,
        'type_id': int_or_none(raw.get('type_id'), 0) or 0,
        'kind': raw['kind'],
        'name': clean_text(raw.get('name'), MAX_NAME, u'') or to_text(cd),
        'count': count,
        'price': int_or_none(raw.get('price'), 0) or 0,
        'fits': bool(raw.get('fits')),
        'special': bool(raw.get('special')),
        'for_sale': raw.get('for_sale', True) is True,
    }


def clean_member(raw):
    if not isinstance(raw, dict):
        return None
    inv_id = int_or_none(raw.get('inv_id'), 0)
    if inv_id is None:
        return None
    return {
        'inv_id': inv_id,
        'name': clean_text(raw.get('name'), MAX_NAME, u'') or to_text(inv_id),
        'role': clean_text(raw.get('role'), MAX_NAME, u''),
        'skills': int_or_none(raw.get('skills'), 0) or 0,
        'premium': bool(raw.get('premium')),
        'locked': bool(raw.get('locked')),
    }


def item_wanted(item, values):
    if not values.get(KINDS[item['kind']]) or not item['for_sale']:
        return False
    if item['fits'] and not values.get('include_fitting'):
        return False
    return not item['special'] or bool(values.get('include_special'))


def member_wanted(member, values):
    # Premium and unique crew (descriptor.isPremium / isFemale) are never dismissed: they cannot be hired again.
    if not values.get(CREW_SWITCH) or member['premium'] or member['locked']:
        return False
    return member['skills'] == 0 or bool(values.get('crew_with_skills'))


def _worth(item):
    return item['price'] * item['count']


def plan(items, crew, values):
    if not any(values.get(key) for key in tuple(KINDS.values()) + (CREW_SWITCH,)):
        return None, REFUSE_UNSET
    chosen = [item for item in (clean_item(raw) for raw in items or ()) if item and item_wanted(item, values)]
    cleaned = [clean_member(raw) for raw in crew or ()]
    members = [member for member in cleaned if member and member_wanted(member, values)]
    if not chosen and not members:
        return None, REFUSE_NOTHING
    chosen.sort(key=lambda item: (-_worth(item), item['name']))
    return {'items': chosen, 'crew': members, 'credits': sum(_worth(item) for item in chosen)}, None


# What the player confirmed, carried in the action the dialog sends: the same items, counts, prices and crew must still
# be on sale when the request goes.
def sale_token(sale):
    if sale is None:
        return None
    items = sorted([item['cd'], item['count'], item['price']] for item in sale['items'])
    crew = sorted(member['inv_id'] for member in sale['crew'])
    packed = json.dumps([items, crew], sort_keys=True).encode('utf-8')
    return hashlib.sha1(packed).hexdigest()[:SALE_TOKEN_LENGTH]


def sell_action(sale):
    return '%s%s%s' % (ACTION_SELL, SALE_TOKEN_SEPARATOR, sale_token(sale))


def is_confirmed(action, sale):
    return sale is not None and action == sell_action(sale)


def item_line(item):
    return u'%d× %s' % (item['count'], item['name'])


def confirm_text(sale, translate):
    parts = [item_line(item) for item in sale['items'][:CONFIRM_ITEMS]]
    hidden = len(sale['items']) - CONFIRM_ITEMS
    if hidden > 0:
        parts.append(translate('depot_seller_more', count=hidden))
    if sale['crew']:
        crew = count_phrase(len(sale['crew']), translate('depot_seller_crew_forms'))
        parts.append(translate('depot_seller_dismiss', crew=crew))
    return translate('depot_seller_confirm', credits=format_number(sale['credits']), items=u', '.join(parts))


def item_row(item, translate):
    return {
        'id': ITEM_ROW_PREFIX + to_text(item['cd']),
        'title': item['name'],
        'subtitle': translate('depot_seller_kind_%s' % item['kind']),
        'meta': translate('depot_seller_row_price', count=item['count'], credits=format_number(_worth(item))),
        'badge': translate('depot_seller_badge_fits') if item['fits'] else None,
        'actions': [],
    }


def member_row(member, translate):
    skills = translate('depot_seller_row_skills', count=member['skills']) if member['skills'] else None
    return {
        'id': CREW_ROW_PREFIX + to_text(member['inv_id']),
        'title': member['name'],
        'subtitle': member['role'] or None,
        'meta': skills,
        'badge': translate('depot_seller_badge_crew'),
        'actions': [],
    }


def build_page(sale, refusal, translate):
    if sale is None:
        return {'kind': 'list', 'empty': translate('depot_seller_empty_%s' % refusal), 'rows': []}
    rows = [item_row(item, translate) for item in sale['items']]
    rows.extend(member_row(member, translate) for member in sale['crew'])
    return {'kind': 'list', 'empty': translate('depot_seller_empty_nothing'), 'rows': rows}
