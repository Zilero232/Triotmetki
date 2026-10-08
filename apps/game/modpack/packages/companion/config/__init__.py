from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import is_int, string_types, to_text
from ...core.settings import Schema, Settings, fix
from ...core.vendor import six
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
    PLAIN_SCHEME,
    RETIRED_DEFAULTS,
    SECURE_SCHEME,
    USER_SET_KEY,
)
from .dev import is_dev_install  # noqa: F401
from .user_set import normalize_user_set, record_user_set, user_set_tokens, with_user_set  # noqa: F401


_urlparse = six.moves.urllib.parse.urlparse


def is_valid_server_url(url):
    if not isinstance(url, string_types):
        return False
    try:
        parts = _urlparse(to_text(url).strip())
        host = parts.hostname
        port = parts.port
    except (TypeError, ValueError):
        return False
    if port is not None and not 0 < port < 65536:
        return False
    if not host or parts.username is not None or parts.password is not None or parts.query or parts.fragment:
        return False
    if parts.scheme == SECURE_SCHEME:
        return True
    return parts.scheme == PLAIN_SCHEME and host in LOCAL_HOSTS


def normalize_server_url(url):
    return to_text(url).strip().rstrip('/') if is_valid_server_url(url) else None


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
        if revision < since and key not in chosen:
            upgraded_values[key] = value
    return upgraded_values


class Config(Settings):
    schema = SCHEMA

    def __init__(self, values=None, allow_custom_server=False):
        Settings.__init__(self, upgraded(values))
        self.allow_custom_server = allow_custom_server

    @property
    def server_url(self):
        return self.values['server_url'] if self.allow_custom_server else DEFAULT_SERVER_URL

    def custom_server(self):
        url = self.server_url
        return None if url == DEFAULT_SERVER_URL else url

    def endpoint(self, path):
        return self.server_url + '/' + path.lstrip('/')
