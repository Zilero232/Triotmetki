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
    MAX_ROLE_LEVEL,
    PROTECTED_CREW_FLAGS,
    REFUSE_CHANGED,
    REFUSE_NOTHING,
    REFUSE_UNSET,
    SALE_TOKEN_LENGTH,
    SALE_TOKEN_SEPARATOR,
)

# Fair play: only the own depot and barracks, sold with the depot's own request after a confirmation.

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
    member = {
        'inv_id': inv_id,
        'name': clean_text(raw.get('name'), MAX_NAME, u'') or to_text(inv_id),
        'role': clean_text(raw.get('role'), MAX_NAME, u''),
        'role_level': int_or_none(raw.get('role_level'), 0),
        'skills': int_or_none(raw.get('skills'), 0),
        'skill_progress': int_or_none(raw.get('skill_progress'), 0),
        'free_xp': int_or_none(raw.get('free_xp'), 0),
    }
    for flag in PROTECTED_CREW_FLAGS:
        member[flag] = raw.get(flag) is not False
    return member


def item_wanted(item, values):
    if not values.get(KINDS[item['kind']]) or not item['for_sale']:
        return False
    if item['fits'] and not values.get('include_fitting'):
        return False
    return not item['special'] or bool(values.get('include_special'))


def is_protected(member):
    return any(member[flag] for flag in PROTECTED_CREW_FLAGS)


def is_untrained(member):
    role_level = member['role_level']
    if role_level is None or role_level >= MAX_ROLE_LEVEL:
        return False

    progress = (member['skills'], member['skill_progress'], member['free_xp'])
    return progress == (0, 0, 0)


def member_wanted(member, values):
    # Premium, female, unique and special crew cannot be hired again; trained crew took the player's XP.
    if not values.get(CREW_SWITCH) or is_protected(member):
        return False

    return is_untrained(member)


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
        parts.append(_dismiss_part(sale['crew'], translate))
    return translate('depot_seller_confirm', credits=format_number(sale['credits']), items=u', '.join(parts))


def _dismiss_part(crew, translate):
    names = []
    for member in crew[:CONFIRM_ITEMS]:
        names.append(member['name'])
    hidden = len(crew) - CONFIRM_ITEMS
    if hidden > 0:
        names.append(translate('depot_seller_more', count=hidden))

    crew_phrase = count_phrase(len(crew), translate('depot_seller_crew_forms'))
    return translate('depot_seller_dismiss', crew=crew_phrase, names=u', '.join(names))


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
