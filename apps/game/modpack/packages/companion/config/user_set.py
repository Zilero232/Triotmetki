from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import string_types
from .constants import MAX_USER_SET, USER_SET_KEY


def user_set_tokens(text):
    if not isinstance(text, string_types):
        return []
    tokens = []
    for token in text.split():
        if token not in tokens:
            tokens.append(token)
    return tokens


def normalize_user_set(text):
    joined = ' '.join(user_set_tokens(text))
    return joined if len(joined) <= MAX_USER_SET else None


def with_user_set(text, keys):
    tokens = user_set_tokens(text)
    tokens.extend(key for key in keys if key and key not in tokens)
    return ' '.join(tokens)


def record_user_set(config, keys):
    return bool(config.update({USER_SET_KEY: with_user_set(config.get(USER_SET_KEY), keys)}))
