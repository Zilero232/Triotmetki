from __future__ import absolute_import, division, print_function, unicode_literals

import os
import sys

from ..compat import PY2, binary_type
from .constants import APPDATA_ENV, DIR_NAME, ENV_BUFFER_CHARS, LOSSY_CHAR, POSIX_CONFIG, WINDOWS_ROAMING


# Python 2 hands out environment values and `expanduser` as ANSI code page bytes.
def to_path_text(value):
    if value is None or not isinstance(value, binary_type):
        return value
    for encoding in (sys.getfilesystemencoding(), 'utf-8'):
        try:
            return value.decode(encoding or 'utf-8')
        except (UnicodeDecodeError, LookupError):
            continue
    return None


def _windows_env(name):
    try:
        import ctypes
        buffer = ctypes.create_unicode_buffer(ENV_BUFFER_CHARS)
        size = ctypes.windll.kernel32.GetEnvironmentVariableW(name, buffer, ENV_BUFFER_CHARS)
    except Exception:
        return None
    return buffer.value if 0 < size < ENV_BUFFER_CHARS else None


def _env_path(environ, platform, name):
    value = to_path_text(environ.get(name))
    if PY2 and platform == 'win32' and (value is None or LOSSY_CHAR in value) and environ is os.environ:
        value = _windows_env(name) or value
    return value or None


def _home_config(platform, expanduser):
    home = to_path_text(expanduser('~'))
    if not home or home == '~':
        return None
    if platform == 'win32':
        return os.path.join(home, *WINDOWS_ROAMING)
    return os.path.join(home, POSIX_CONFIG)


def durable_dir(environ=None, platform=None, expanduser=os.path.expanduser):
    environ = os.environ if environ is None else environ
    platform = sys.platform if platform is None else platform
    base = _env_path(environ, platform, APPDATA_ENV) or _home_config(platform, expanduser)
    return os.path.join(base, DIR_NAME) if base else None
