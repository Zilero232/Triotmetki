from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import string_types, to_text
from .constants import (  # noqa: F401
    ACTION_CHOOSE,
    ACTION_LOOK,
    ACTION_NATIVE,
    ACTION_REFRESH_PREVIEW,
    ACTIONS,
    CHECK_CAPTURE,
    NO_ENVIRONMENT,
    PREMIUM_FLAGS,
    SLOT_LABELS,
    CHECK_EXPIRED,
    CHECK_IDLE,
    CHECK_WAIT,
    GENERATED_PREFIX,
    HANGAR_NUMBER,
    HIDDEN_MARKERS,
    KNOWN_SPACES,
    LAYOUT_GALLERY,
    LOOK_ROW_PREFIX,
    LOOKS,
    MT_PREFIX,
    NAMED_GENERATED_LOOKS,
    NAME_KEY,
    PLAN_LATER,
    PLAN_LOADED,
    PLAN_RELOAD,
    PLAN_WAIT,
    PREVIEW_FOLDER,
    PREVIEW_SIZE,
    PREVIEWS,
    ROW_NATIVE,
    SPACE_NAME,
    SPACE_PATH_MARK,
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
from .previews import (  # noqa: F401
    CaptureBook,
    GalleryPictures,
    data_uri,
    is_clean_hangar,
    preview_file,
    preview_key,
    preview_key_of_file,
    tile_image,
)
from .thumbnail import ThumbnailError, bitmap_thumbnail  # noqa: F401


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
    names = (space_name(path) for path in paths or ())
    return sorted({name for name in names if name})


# gui.ClientHangarSpace reads _HANGAR_CFGS[path]: a space the client does not list breaks the hangar load.
def available_space(name, names):
    return name if name and name in names else None


# As the client's HangarSpaceReloader.buildHangarSpacePath builds it, lower-cased.
def normalized_space(value):
    if not isinstance(value, string_types) or not to_text(value).strip():
        return None
    text = to_text(value).strip().lower()
    return text if text.startswith(SPACE_PATH_MARK) else SPACES_PREFIX + text


def is_default_override(value, default_path):
    return value is not None and default_path is not None and normalized_space(value) == normalized_space(default_path)


# A cmd_change_hangar notification naming the default hangar only re-states it: no event hangar.
def taken_slots(current, owned, wanted, default_path):
    if wanted is None:
        return {}
    return {
        is_premium: value for is_premium, value in current.items()
        if value is not None and value != owned and is_default_override(value, default_path)
    }


def override_changes(current, owned, wanted, default_path=None, kept=None):
    kept = kept or {}
    changes = {}
    for is_premium in PREMIUM_FLAGS:
        value = current.get(is_premium)
        is_server = value is not None and value != owned
        if is_server and not (wanted is not None and is_default_override(value, default_path)):
            continue
        target = wanted if wanted is not None else kept.get(is_premium)
        if value != target:
            changes[is_premium] = target
    return changes


def wanted_environments(targets, path, environment):
    wanted = {}
    for is_premium in PREMIUM_FLAGS:
        is_ours = bool(environment) and same_path(targets.get(is_premium), path)
        wanted[is_premium] = environment if is_ours else u''
    return wanted


def environment_changes(current, owned, wanted, taken=(), kept=None):
    kept = kept or {}
    changes = {}
    for is_premium in PREMIUM_FLAGS:
        value = current.get(is_premium) or u''
        if value and value != owned and is_premium not in taken:
            continue
        target = wanted.get(is_premium, u'')
        if not target and is_premium not in taken:
            target = kept.get(is_premium, u'')
        if value != target:
            changes[is_premium] = target
    return changes


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
    order = {name: index for index, name in enumerate(KNOWN_SPACES)}
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


def space_row(name, chosen, current, translate, previews=None):
    badge = None
    if name == chosen:
        badge = translate('hangar_space_badge_chosen')
    elif name == current:
        badge = translate('hangar_space_badge_current')
    row = {
        'id': name,
        'title': space_title(name, translate),
        'subtitle': name,
        'image': tile_image(preview_key(name), previews or {}, space_preview(name)),
        'badge': badge,
        'actions': [] if name == chosen else [{'id': ACTION_CHOOSE, 'label': translate('hangar_space_choose')}],
    }
    if name == chosen and name == current:
        row['meta'] = translate('hangar_space_loaded')
    return row


def look_row(look, chosen, translate, previews=None):
    section = translate('hangar_space_section_looks')
    return {
        'id': LOOK_ROW_PREFIX + look.id,
        'title': look_title(look, translate),
        'subtitle': section + SUBTITLE_SEPARATOR + space_title(look.space, translate),
        'image': tile_image(preview_key(look.space, look.id), previews or {}, look_preview(look.id)),
        'badge': translate('hangar_space_badge_chosen') if look.id == chosen else None,
        'actions': [] if look.id == chosen else [{'id': ACTION_LOOK, 'label': translate('hangar_space_choose')}],
    }


def row_look(row):
    if not isinstance(row, string_types) or not row.startswith(LOOK_ROW_PREFIX):
        return None
    return normalize_look(row[len(LOOK_ROW_PREFIX):]) or None


def native_row(is_chosen, translate, image=None):
    return {
        'id': ROW_NATIVE,
        'title': translate('hangar_space_native'),
        'subtitle': translate('hangar_space_native_hint'),
        'image': image,
        'badge': translate('hangar_space_badge_chosen') if is_chosen else None,
        'actions': [] if is_chosen else [{'id': ACTION_NATIVE, 'label': translate('hangar_space_choose')}],
    }


def build_page(names, chosen, current, translate, looks=(), look=u'', pictures=None):
    pictures = pictures or GalleryPictures()
    previews = pictures.previews
    active = find_look(looks, look)
    space = u'' if active is not None else chosen
    native_image = tile_image(preview_key(pictures.default), previews) if pictures.default else None
    rows = [native_row(not space and active is None, translate, native_image)]
    rows.extend(look_row(item, active.id if active else None, translate, previews) for item in looks)
    rows.extend(space_row(name, space, current, translate, previews) for name in listed_spaces(names))
    return {
        'kind': 'list',
        'layout': LAYOUT_GALLERY,
        'note': translate('hangar_space_note'),
        'empty': translate('hangar_space_empty'),
        'rows': rows,
    }
