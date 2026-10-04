from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import is_int, string_types
from ...core.settings import Schema, Settings, fix
from .constants import (  # noqa: F401
    CHOICES,
    DEFAULT_SERVER_URL,
    DEFAULTS,
    DEFAULTS_REVISION,
    FEATURES,
    FIXED,
    LIMITS,
    LOCAL_HOSTS,
    ONE_TIME_SWITCHES,
    OPT_IN_FEATURES,
    RETIRED_DEFAULTS,
    USER_SET_KEY,
)
from .user_set import normalize_user_set, user_set_tokens, with_user_set  # noqa: F401


def is_valid_server_url(url):
    if not isinstance(url, string_types):
        return False
    url = url.strip()
    if url.startswith('https://') and len(url) > len('https://'):
        return True
    return any(_is_on_host(url, host) for host in LOCAL_HOSTS)


def _is_on_host(url, host):
    return url == host or url.startswith(host + ':') or url.startswith(host + '/')


def normalize_server_url(url):
    return url.rstrip('/') if is_valid_server_url(url) else None


SCHEMA = fix(
    Schema(
        DEFAULTS,
        choices=CHOICES,
        limits=LIMITS,
        normalizers={'server_url': normalize_server_url, USER_SET_KEY: normalize_user_set},
    ),
    FIXED,
)


def _stored_revision(values):
    revision = values.get('defaults_revision')
    return revision if is_int(revision) else 0


# A fresh config (None) stays None: it takes today's defaults, so only a stored one is upgraded.
def upgraded(values):
    if not isinstance(values, dict):
        return values

    revision = _stored_revision(values)
    upgraded_values = dict(values, defaults_revision=DEFAULTS_REVISION)
    chosen = user_set_tokens(values.get(USER_SET_KEY))
    for since, key, old, new in RETIRED_DEFAULTS:
        if revision < since and values.get(key) == old and key not in chosen:
            upgraded_values[key] = new
    for since, key, value in ONE_TIME_SWITCHES:
        if revision < since:
            upgraded_values[key] = value
    return upgraded_values


class Config(Settings):

    schema = SCHEMA

    def __init__(self, values=None):
        Settings.__init__(self, upgraded(values))

    @property
    def server_url(self):
        return self.values['server_url']

    def endpoint(self, path):
        return self.server_url + '/' + path.lstrip('/')
