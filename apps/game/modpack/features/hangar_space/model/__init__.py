from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import string_types, to_text
from .constants import (  # noqa: F401
    ACTION_CHOOSE,
    ACTION_LOOK,
    ACTION_NATIVE,
    HANGAR_NUMBER,
    HIDDEN_MARKERS,
    KNOWN_SPACES,
    LAYOUT_GALLERY,
    LOOK_ROW_PREFIX,
    LOOKS,
    MT_PREFIX,
    NAME_KEY,
    PLAN_LATER,
    PLAN_LOADED,
    PLAN_RELOAD,
    PLAN_WAIT,
    PREVIEWS,
    ROW_NATIVE,
    SPACE_NAME,
    SPACES_PREFIX,
    SUBTITLE_SEPARATOR,
)
from .looks import (  # noqa: F401
    Look,
    available_looks,
    environment_folder,
    environment_table,
    find_look,
    look_preview,
    look_title,
    normalize_look,
)

# Only the look of the own hangar, from the spaces the client already has. A server event hangar (the client's
# cmd_change_hangar notifications) and the hangars of other modes win over the choice.


def normalize_space(value):
    text = to_text(value).strip().lower() if isinstance(value, string_types) else u''
    if not text:
        return u''
    return text if SPACE_NAME.match(text) else None


def space_path(name):
    return SPACES_PREFIX + name if name else None


def space_name(path):
    if not isinstance(path, string_types):
        return None
    text = to_text(path).strip().lower()
    if not text.startswith(SPACES_PREFIX):
        return None
    name = text[len(SPACES_PREFIX):]
    return name if SPACE_NAME.match(name) else None


def space_names(paths):
    return sorted(set(name for name in (space_name(path) for path in paths or ()) if name))


# A folder typed into the advanced field that the client has no hangar config of would break the hangar load
# (gui.ClientHangarSpace reads _HANGAR_CFGS[path] for the space it loads): only a space the client lists is written.
def available_space(name, names):
    return name if name and name in names else None


def override_changes(current, owned, wanted):
    """{is_premium: new override or None to drop it} for the default hangar's space overrides: ours is written or
    dropped only where the slot is empty or already holds ours; an override the server set (an event hangar) stays."""
    changes = {}
    for is_premium in (True, False):
        value = current.get(is_premium)
        if value is not None and value != owned:
            continue
        if value != wanted:
            changes[is_premium] = wanted
    return changes


# The environment slot follows the space slot of the same premium flag: an environment is a name inside one space, so
# ours goes only where that flag's hangar is the look's space; elsewhere (an event hangar, the other flag) it is empty.
def wanted_environments(targets, path, environment):
    wanted = {}
    for is_premium in (True, False):
        is_ours = bool(environment) and same_path(targets.get(is_premium), path)
        wanted[is_premium] = environment if is_ours else u''
    return wanted


# {is_premium: environment name, or u'' to empty the slot}: like the space slot, an environment the server set (an
# event's environment) stays; ours is written or emptied only where the slot is empty or holds ours.
def environment_changes(current, owned, wanted):
    changes = {}
    for is_premium in (True, False):
        value = current.get(is_premium) or u''
        if value and value != owned:
            continue
        if value != wanted.get(is_premium, u''):
            changes[is_premium] = wanted.get(is_premium, u'')
    return changes


# A look chosen wins over the chosen space (picking a space clears the look); a look this client lacks (a patch
# renamed or dropped its environment) leaves the chosen space, or the game's own hangar.
def chosen_target(space, look, names):
    if look is not None:
        return space_path(look.space), look.environment
    return space_path(available_space(space, names)), u''


def readable_title(name):
    text = HANGAR_NUMBER.sub(u'', to_text(name))
    if text.startswith(MT_PREFIX):
        text = text[len(MT_PREFIX):]
    text = u' '.join(part for part in text.split(u'_') if part)
    return text[:1].upper() + text[1:] if text else to_text(name)


def space_title(name, translate):
    return translate(NAME_KEY % name) if name in KNOWN_SPACES else readable_title(name)


def space_preview(name):
    return PREVIEWS.get(name) if name else None


def is_listed(name):
    return not any(marker in name for marker in HIDDEN_MARKERS)


def listed_spaces(names):
    order = dict((name, index) for index, name in enumerate(KNOWN_SPACES))
    listed = [name for name in names if is_listed(name)]
    return sorted(listed, key=lambda name: (order.get(name, len(order)), name))


def same_path(first, second):
    if not isinstance(first, string_types) or not isinstance(second, string_types):
        return False
    return to_text(first).strip().lower() == to_text(second).strip().lower()


def reload_plan(default_scene, ready, target, loaded):
    if not default_scene:
        return PLAN_LATER
    if not ready:
        return PLAN_WAIT
    return PLAN_LOADED if same_path(target, loaded) else PLAN_RELOAD


def space_row(name, chosen, current, translate):
    badge = None
    if name == chosen:
        badge = translate('hangar_space_badge_chosen')
    elif name == current:
        badge = translate('hangar_space_badge_current')
    row = {
        'id': name,
        'title': space_title(name, translate),
        'subtitle': name,
        'image': space_preview(name),
        'badge': badge,
        'actions': [] if name == chosen else [{'id': ACTION_CHOOSE, 'label': translate('hangar_space_choose')}],
    }
    if name == chosen and name == current:
        row['meta'] = translate('hangar_space_loaded')
    return row


def look_row(look, chosen, translate):
    section = translate('hangar_space_section_looks')
    return {
        'id': LOOK_ROW_PREFIX + look.id,
        'title': look_title(look, translate),
        'subtitle': section + SUBTITLE_SEPARATOR + space_title(look.space, translate),
        'image': look_preview(look.id),
        'badge': translate('hangar_space_badge_chosen') if look.id == chosen else None,
        'actions': [] if look.id == chosen else [{'id': ACTION_LOOK, 'label': translate('hangar_space_choose')}],
    }


def row_look(row):
    if not isinstance(row, string_types) or not row.startswith(LOOK_ROW_PREFIX):
        return None
    return normalize_look(row[len(LOOK_ROW_PREFIX):]) or None


def native_row(is_chosen, translate):
    return {
        'id': ROW_NATIVE,
        'title': translate('hangar_space_native'),
        'subtitle': translate('hangar_space_native_hint'),
        'image': None,
        'badge': translate('hangar_space_badge_chosen') if is_chosen else None,
        'actions': [] if is_chosen else [{'id': ACTION_NATIVE, 'label': translate('hangar_space_choose')}],
    }


# The looks come first, as the rows of the page's look section (each subtitled with the section and its space), then
# the spaces.
def build_page(names, chosen, current, translate, looks=(), look=u''):
    active = find_look(looks, look)
    space = u'' if active is not None else chosen
    rows = [native_row(not space and active is None, translate)]
    rows.extend(look_row(item, active.id if active else None, translate) for item in looks)
    rows.extend(space_row(name, space, current, translate) for name in listed_spaces(names))
    return {
        'kind': 'list',
        'layout': LAYOUT_GALLERY,
        'note': translate('hangar_space_note'),
        'empty': translate('hangar_space_empty'),
        'rows': rows,
    }
