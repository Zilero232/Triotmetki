from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import string_types, to_text
from .constants import ACTION_ARMOR, ARMOR_PATH, SLUG_DROPPED, SLUG_SEPARATORS

# Fair play: only a link to the site; nothing analysed in the client or shown in battle (Lesta 15152).


def tank_slug(vehicle_name):
    if not isinstance(vehicle_name, string_types):
        return None
    tag = to_text(vehicle_name).split(u':')[-1].strip().lower()
    words = SLUG_DROPPED.sub(u'', tag.replace(u'&', u' and '))
    slug = SLUG_SEPARATORS.sub(u'-', words).strip(u'-')
    return slug or None


def armor_actions(vehicle_name, translate):
    slug = tank_slug(vehicle_name)
    if slug is None:
        return []
    return [{'id': ACTION_ARMOR, 'label': translate('hangar_info_armor'), 'link': ARMOR_PATH % slug, 'confirm': None}]
