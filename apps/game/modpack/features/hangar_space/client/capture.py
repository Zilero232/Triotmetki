from __future__ import absolute_import, division, print_function, unicode_literals

import glob
import importlib
import io
import os

import BigWorld

from ....core.client.game import service
from ....core.client.lobby_view import hidden_layers, lobby_view
from ....core.compat import to_native, to_text
from ....core.log import log, log_exception, safe
from ....core.storage import write_bytes_atomic
from ..model import (
    PREVIEW_SIZE,
    ThumbnailError,
    bitmap_thumbnail,
    data_uri,
    is_clean_hangar,
    preview_file,
    preview_key_of_file,
)
from .constants import (
    HIDE_SETTLE_S,
    PERSONALITY_CALLBACK,
    PERSONALITY_MODULE,
    SHOT_EXTENSION,
    SHOT_FOLDER,
    SHOT_NAME,
    SHOT_TIMEOUT_S,
)


class PreviewStore(object):

    def __init__(self, folder):
        self.folder = folder
        self.encoded = {}

    def path(self, key):
        return os.path.join(self.folder, preview_file(key))

    def has(self, key):
        return bool(key) and os.path.isfile(self.path(key))

    def save(self, key, png):
        write_bytes_atomic(self.path(key), png)
        self.encoded.pop(key, None)

    def data_uri(self, key):
        return self._encoded(key) if self.has(key) else None

    def data_uris(self):
        if not os.path.isdir(self.folder):
            return {}
        uris = {}
        for name in os.listdir(self.folder):
            key = preview_key_of_file(name)
            if key is not None:
                uris[key] = self._encoded(key)
        return uris

    def _encoded(self, key):
        path = self.path(key)
        stamp = (os.path.getmtime(path), os.path.getsize(path))
        cached = self.encoded.get(key)
        if cached is None or cached[0] != stamp:
            with io.open(path, 'rb') as stream:
                cached = (stamp, data_uri(stream.read()))
            self.encoded[key] = cached
        return cached[1]


def clean_hangar_on_screen():
    watch = lobby_view()
    if not watch.install() or watch.manager is None:
        return False
    windows = watch.manager.findWindows(lambda window: True) or []
    return is_clean_hangar([watch.describe(window) for window in windows])


def _own_shown_windows():
    watch = lobby_view()
    if watch.manager is None:
        return []
    windows = watch.manager.findWindows(lambda window: True) or []
    shown = []
    for window in windows:
        described = watch.describe(window)
        if described['own'] and described['alive'] and not window.isHidden():
            shown.append(window)
    return shown


def _lobby_layers():
    from skeletons.gui.app_loader import IAppLoader
    loader = service(IAppLoader)
    lobby = loader.getDefLobbyApp() if loader is not None else None
    layers = hidden_layers()
    return (lobby.containerManager, layers) if lobby is not None else (None, layers)


def hide_interface(restore):
    manager, layers = _lobby_layers()
    if manager is not None:
        manager.hideContainers(layers, 0)
        restore.append(lambda: manager.showContainers(layers, 0))
    for window in _own_shown_windows():
        window.hide()
        restore.append(lambda shown=window: shown.show(False))


def restore_interface(restore):
    for step in reversed(restore):
        try:
            step()
        except Exception:
            log_exception('hangar preview: interface back')


def _stock_notify():
    try:
        module = importlib.import_module(str(PERSONALITY_MODULE))
    except Exception:
        return None
    return getattr(module, PERSONALITY_CALLBACK, None)


class SceneShot(object):

    def __init__(self, store, on_done):
        self.store = store
        self.on_done = on_done
        self.key = None
        self.restore = []
        self.generation = 0
        self.previous_notify = None

    @property
    def busy(self):
        return self.key is not None

    @property
    def folder(self):
        return os.path.join(self.store.folder, SHOT_FOLDER)

    def take(self, key):
        if self.busy:
            return False
        previous_notify = _stock_notify()
        if previous_notify is None:
            log('hangar preview: the client screenshot callback is unknown, no shot')
            return False

        self.restore = []
        try:
            self._clear_folder()
            hide_interface(self.restore)
        except Exception:
            log_exception('hangar preview: interface off')
            restore_interface(self.restore)
            return False

        self.previous_notify = previous_notify
        self.key = key
        self.generation += 1
        generation = self.generation
        BigWorld.callback(HIDE_SETTLE_S, safe(lambda: self._shoot(generation)))
        return True

    def _clear_folder(self):
        if not os.path.isdir(self.folder):
            os.makedirs(self.folder)
        for path in glob.glob(os.path.join(self.folder, '*')):
            os.remove(path)

    def _shoot(self, generation):
        if generation != self.generation or not self.busy:
            return
        BigWorld.setScreenshotNotifyCallback(safe(lambda path: self._finish(generation, path)))
        BigWorld.callback(SHOT_TIMEOUT_S, safe(lambda: self._finish(generation, None)))
        BigWorld.screenShot(to_native(SHOT_EXTENSION), to_native(os.path.join(self.folder, SHOT_NAME)))

    def _newest_capture(self):
        found = glob.glob(os.path.join(self.folder, '*'))
        return max(found, key=os.path.getmtime) if found else None

    def _finish(self, generation, path):
        if generation != self.generation or not self.busy:
            return
        key = self.key
        self.key = None
        BigWorld.setScreenshotNotifyCallback(self.previous_notify)
        self.previous_notify = None
        restore_interface(self.restore)
        self.restore = []
        self.on_done(key, self._keep(key, path or self._newest_capture()))

    def _keep(self, key, path):
        if not path or not os.path.isfile(path):
            log('hangar preview: the engine wrote no screenshot for %s' % key)
            return False
        try:
            with io.open(path, 'rb') as stream:
                png = bitmap_thumbnail(stream.read(), PREVIEW_SIZE)
        except (IOError, OSError, ThumbnailError) as error:
            log('hangar preview: %s is no usable bitmap (%s)' % (to_text(path), to_text(error)))
            return False
        finally:
            self._clear_folder()
        self.store.save(key, png)
        log('hangar preview: %s saved, %d bytes' % (key, len(png)))
        return True
