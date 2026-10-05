from __future__ import absolute_import, division, print_function, unicode_literals

import binascii
import os

from ...core.compat import string_types, to_text
from ...core.format import single_spaces
from .constants import ERROR_LIMIT, ERROR_MISSING, ERROR_NAME, FILE_VERSION, MAX_PROFILES, NAME_MAX_LENGTH
from .errors import ProfileError


def normalize_name(name):
    if not isinstance(name, string_types):
        raise ProfileError(ERROR_NAME)
    name = single_spaces(name)[:NAME_MAX_LENGTH].strip()
    if not name:
        raise ProfileError(ERROR_NAME)
    return name


def random_id():
    return to_text(binascii.hexlify(os.urandom(6)))


def _is_profile(item):
    if not isinstance(item, dict):
        return False
    has_names = isinstance(item.get('id'), string_types) and isinstance(item.get('name'), string_types)
    return has_names and isinstance(item.get('data'), dict)


class ProfileStore(object):

    def __init__(self, store, clock, new_id=random_id):
        self.store = store
        self.clock = clock
        self.new_id = new_id
        data = store.read({})
        if not isinstance(data, dict):
            data = {}
        stored = data.get('profiles')
        profiles = [dict(item) for item in stored if _is_profile(item)] if isinstance(stored, list) else []
        self.profiles = profiles[:MAX_PROFILES]
        active = data.get('active')
        self.active = active if self.get(active) is not None else None

    def items(self):
        return [{'id': item['id'], 'name': item['name'], 'updated': item.get('updated')} for item in self.profiles]

    def get(self, profile_id):
        for item in self.profiles:
            if item['id'] == profile_id:
                return item
        return None

    def save(self, name, data, profile_id=None):
        name = normalize_name(name)
        now = self.clock()
        if profile_id is not None:
            item = self._existing(profile_id)
            item.update({'name': name, 'data': data, 'updated': now})
        else:
            item = self._add(name, data, now)
        self.active = item['id']
        self._persist()
        return item

    def _existing(self, profile_id):
        item = self.get(profile_id)
        if item is None:
            raise ProfileError(ERROR_MISSING)
        return item

    def _add(self, name, data, now):
        if len(self.profiles) >= MAX_PROFILES:
            raise ProfileError(ERROR_LIMIT)
        item = {'id': self._unique_id(), 'name': name, 'created': now, 'updated': now, 'data': data}
        self.profiles.append(item)
        return item

    def rename(self, profile_id, name):
        item = self._existing(profile_id)
        item['name'] = normalize_name(name)
        item['updated'] = self.clock()
        self._persist()
        return item

    def delete(self, profile_id):
        item = self._existing(profile_id)
        self.profiles = [other for other in self.profiles if other is not item]
        if self.active == profile_id:
            self.active = None
        self._persist()

    def activate(self, profile_id):
        item = self._existing(profile_id)
        self.active = profile_id
        self._persist()
        return item

    def _unique_id(self):
        while True:
            candidate = self.new_id()
            if self.get(candidate) is None:
                return candidate

    def _persist(self):
        self.store.write({'version': FILE_VERSION, 'active': self.active, 'profiles': self.profiles})
