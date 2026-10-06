from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.compat import to_native
from ....core.log import log_exception
from ..model import environment_folder, environment_table, space_path
from .constants import (
    ACTIVE_ENVIRONMENT,
    DEFAULT_CONFIG_ATTR,
    ENVIRONMENT_ENTRY,
    ENVIRONMENT_NAME,
    ENVIRONMENT_SWITCHER,
    ENVIRONMENT_XML,
    ENVIRONMENTS_XML,
    PREMIUM_FLAGS,
)

# A space's files do not change while the client runs: each space's environments are read once.
_tables = {}


def _open(path):
    import ResMgr
    return ResMgr.openSection(to_native(path))


def _environment_name(path, guid):
    section = _open(ENVIRONMENT_XML % (path, environment_folder(guid)))
    return section.readString(ENVIRONMENT_NAME) if section is not None else u''


def _read_table(path):
    root = _open(ENVIRONMENTS_XML % path)
    if root is None:
        return [], u''
    guids = [section.asString for name, section in root.items() if name == ENVIRONMENT_ENTRY]
    entries = [(guid, _environment_name(path, guid)) for guid in guids]
    return environment_table(entries, root.readString(ACTIVE_ENVIRONMENT))


# A space whose files the client refuses to read has no looks: the gallery and the hangar stay as the game has them.
def environment_table_of(path):
    key = path.lower()
    if key not in _tables:
        try:
            _tables[key] = _read_table(key)
        except Exception:
            log_exception('hangar space: environments of %s' % key)
            _tables[key] = ([], u'')
    return _tables[key]


def environment_names(names):
    return dict((name, environment_table_of(space_path(name))[0]) for name in names)


def active_environment(path):
    return environment_table_of(path)[1] if path else u''


# UNVERIFIED on Lesta 1.45: DefaultHangarSpaceConfig keeps getEnvironment / setEnvironment / discardEnvironment; a
# config without them has no environment slot, and the looks then do nothing.
def environment_slots(switcher):
    config = getattr(switcher, DEFAULT_CONFIG_ATTR, None)
    read = getattr(config, 'getEnvironment', None)
    if read is None:
        return None
    return dict((is_premium, read(is_premium)) for is_premium in PREMIUM_FLAGS)


def slot_targets(switcher):
    config = getattr(switcher, DEFAULT_CONFIG_ATTR)
    return dict((is_premium, config.getHangarSpaceId(is_premium)) for is_premium in PREMIUM_FLAGS)


def write_environments(switcher, changes):
    config = getattr(switcher, DEFAULT_CONFIG_ATTR)
    for is_premium, name in changes.items():
        if name:
            config.setEnvironment(is_premium, name)
        else:
            config.discardEnvironment(is_premium)


# UNVERIFIED on Lesta 1.45 outside a server event: that setMainEnvironment on the loaded hangar keeps the vehicle and
# the camera (the client calls it the same way when an event changes only the environment).
def switch_environment(name):
    switcher = getattr(BigWorld, ENVIRONMENT_SWITCHER, None)
    if switcher is None:
        return False
    switcher.instance().setMainEnvironment(to_native(name), tryActivate=True)
    return True
