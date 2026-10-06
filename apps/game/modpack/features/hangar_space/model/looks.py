from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import string_types, to_text
from ....core.vendor import attr
from .constants import GENERATED_PREFIX, LOOK_ID, LOOK_NAME_KEY, LOOK_PREVIEWS, LOOKS, NAMED_GENERATED_LOOKS


@attr.s(frozen=True)
class Look(object):

    id = attr.ib()
    space = attr.ib()
    environment = attr.ib()


def stock_looks():
    return [Look(*row) for row in LOOKS]


def normalize_look(value):
    text = to_text(value).strip() if isinstance(value, string_types) else u''
    if not text:
        return u''
    return text if LOOK_ID.match(text) else None


def environment_folder(guid):
    return to_text(guid).strip().replace(u'.', u'-')


def environment_table(entries, active_guid):
    names = []
    active = u''
    wanted = to_text(active_guid or u'').strip().lower()
    for guid, name in entries:
        name = to_text(name or u'').strip()
        if not name:
            continue
        if name not in names:
            names.append(name)
        if not active and wanted and to_text(guid).strip().lower() == wanted:
            active = name
    return names, active


def generated_looks(spaces, environments):
    looks = []
    seen = set()
    for space in spaces:
        for name in environments.get(space, ()):
            if name.startswith(GENERATED_PREFIX) and LOOK_ID.match(name) and name not in seen:
                seen.add(name)
                looks.append(Look(name, space, name))
    return looks


# A look shows only where its space is a hangar the client lists and that space ships its environment: a look a patch
# renamed or removed drops out of the gallery by itself, and a chosen one falls back to the game's own.
def available_looks(spaces, environments):
    listed = set(spaces)
    stock = [look for look in stock_looks()
             if look.space in listed and look.environment in environments.get(look.space, ())]
    return stock + generated_looks(spaces, environments)


def find_look(looks, look_id):
    if not look_id:
        return None
    return next((look for look in looks if look.id == look_id), None)


def is_stock(look_id):
    return any(row[0] == look_id for row in LOOKS)


def generated_title(name):
    text = to_text(name)[len(GENERATED_PREFIX):] if name.startswith(GENERATED_PREFIX) else to_text(name)
    text = u' '.join(part for part in text.split(u'_') if part)
    return text[:1].upper() + text[1:] if text else to_text(name)


def look_title(look, translate):
    if is_stock(look.id) or look.id in NAMED_GENERATED_LOOKS:
        return translate(LOOK_NAME_KEY % look.id)
    return generated_title(look.environment)


def look_preview(look_id):
    return LOOK_PREVIEWS.get(look_id) if look_id else None
