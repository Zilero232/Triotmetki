from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr, service
from ....core.hooks import subscribe, unsubscribe
from ..model import space_name
from .constants import (
    CONTROLLER_SKELETON,
    DEFAULT_CONFIG_ATTR,
    DEFAULT_HANGAR_PATH,
    DEFAULT_SCENE,
    HANGAR_CONFIGS,
    HANGAR_SPACE_SKELETON,
    OVERRIDES_ATTR,
    SPACE_CREATED,
)


def controller():
    return service(client_attr(*CONTROLLER_SKELETON))


def hangar_space():
    return service(client_attr(*HANGAR_SPACE_SKELETON))


def available_paths():
    configs = client_attr(*HANGAR_CONFIGS)
    return list(configs.keys()) if isinstance(configs, dict) else []


# Before the lobby read the hangar configs the client's table is still an empty HangarConfig: no default yet.
def default_path():
    read = client_attr(*DEFAULT_HANGAR_PATH)
    try:
        return read(False) if callable(read) else None
    except Exception:
        return None


def current_name():
    return space_name(getattr(hangar_space(), 'spacePath', None))


def is_default_scene(switcher):
    return getattr(switcher, 'currentSceneName', None) == client_attr(*DEFAULT_SCENE)


def space_ready(hangar):
    return bool(getattr(hangar, 'spaceInited', False)) and not hangar.spaceLoading()


def target_path(switcher, hangar):
    config = getattr(switcher, DEFAULT_CONFIG_ATTR)
    return config.getHangarSpaceId(bool(getattr(hangar, 'isPremium', False)))


def overrides(switcher):
    config = getattr(switcher, DEFAULT_CONFIG_ATTR, None)
    return dict(getattr(config, OVERRIDES_ATTR, None) or {})


def write_overrides(switcher, changes):
    config = getattr(switcher, DEFAULT_CONFIG_ATTR)
    for is_premium, path in changes.items():
        if path is None:
            config.discardSpaceIdOverride(is_premium)
        else:
            config.setSpaceIdOverride(is_premium, path)


def once_space_created(hangar, handler):
    guarded = []

    def created():
        unsubscribe(hangar, SPACE_CREATED, guarded[0])
        handler()
    guarded.append(subscribe(hangar, SPACE_CREATED, created))
