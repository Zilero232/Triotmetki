from __future__ import absolute_import, division, print_function, unicode_literals

from ...log import log_exception, safe
from ...native_settings import merge_value, write_settings
from ..game import service


def settings_core():
    try:
        from skeletons.account_helpers.settings_core import ISettingsCore
    except ImportError:
        return None
    return service(ISettingsCore)


def settings_cache():
    try:
        from skeletons.account_helpers.settings_core import ISettingsCache
    except ImportError:
        return None
    return service(ISettingsCache)


# RU 1.45 gui/shared/utils/requesters/IntSettingsRequester.py requireSync: before the server settings arrive the
# core answers every read with the option's default (logging an error), which looks like a real value.
def settings_synced():
    """Whether the player's server settings have arrived; True when the client has no settings cache to ask."""
    cache = settings_cache()
    if cache is None:
        return True
    return bool(cache.isSynced())


def on_settings_synced(callback):
    """Calls `callback()` once when the server settings arrive; False when the client offers no such event."""
    cache = settings_cache()
    event = getattr(cache, 'onSyncCompleted', None)
    if event is None:
        return False

    @safe
    def once(*args):
        event.__isub__(once)
        callback()

    event.__iadd__(once)
    return True


def read_settings(names):
    """{name: value} of the player's settings the core knows (an unknown name is left out), or None (no core, or the
    server settings have not arrived yet)."""
    core = settings_core()
    if core is None or not settings_synced():
        return None
    values = {}
    for name in names:
        try:
            value = core.getSetting(name)
        except Exception:
            continue
        if value is not None:
            values[name] = value
    return values


def apply_settings(values):
    """Writes settings the way the game's settings window does (apply, store, confirm, clear). False without a core."""
    core = settings_core()
    if core is None:
        return False
    if not values:
        return True
    try:
        write_settings(core, values)
    except Exception:
        log_exception('apply client settings')
        return False
    return True


def apply_changed(values):
    """Applies only the values that differ from the current ones (unknown names are skipped)."""
    current = read_settings(list(values))
    if current is None:
        return False
    diff = {}
    for name, value in values.items():
        if name in current:
            value = merge_value(current[name], value)
            if current[name] != value:
                diff[name] = value
    return apply_settings(diff)
