from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import string_types, to_text
from .constants import FAVOURITES_MAX, INDEX_MAX


def _is_text_pair(item):
    if not isinstance(item, list) or len(item) != 2:
        return False
    arena_unique_id, replay_id = item
    return isinstance(arena_unique_id, string_types) and isinstance(replay_id, string_types)


def _list_of(data, key):
    value = data.get(key)
    return value if isinstance(value, list) else []


class UploadedIndex(object):

    def __init__(self, store):
        self.store = store
        self.items = []
        self.favourites = []
        self._load(store.read({}))

    def _load(self, data):
        if not isinstance(data, dict):
            return
        uploaded = [item for item in _list_of(data, 'uploaded') if _is_text_pair(item)]
        self.items = [(to_text(arena_unique_id), to_text(replay_id)) for arena_unique_id, replay_id in uploaded]
        favourites = [key for key in _list_of(data, 'favourites') if isinstance(key, string_types) and key]
        self.favourites = [to_text(key) for key in favourites][-FAVOURITES_MAX:]

    def _persist(self):
        self.store.write({'uploaded': [list(item) for item in self.items], 'favourites': list(self.favourites)})

    def add(self, arena_unique_id, replay_id):
        if not arena_unique_id or not isinstance(replay_id, string_types) or not replay_id:
            return False
        arena_unique_id = to_text(arena_unique_id)

        others = [item for item in self.items if item[0] != arena_unique_id]
        self.items = (others + [(arena_unique_id, to_text(replay_id))])[-INDEX_MAX:]
        self._persist()
        return True

    def get(self, arena_unique_id):
        for arena, replay_id in self.items:
            if arena == arena_unique_id:
                return replay_id
        return None

    def is_favourite(self, key):
        return bool(key) and to_text(key) in self.favourites

    def set_favourite(self, key, is_on):
        if not key:
            return False
        key = to_text(key)
        if is_on == (key in self.favourites):
            return False

        others = [item for item in self.favourites if item != key]
        added = [key] if is_on else []
        self.favourites = (others + added)[-FAVOURITES_MAX:]
        self._persist()
        return True

    def moved(self, old_key, new_key):
        if old_key == new_key or not self.is_favourite(old_key):
            return
        self.favourites = [new_key if item == old_key else item for item in self.favourites]
        self._persist()
