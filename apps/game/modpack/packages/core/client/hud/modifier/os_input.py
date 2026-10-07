from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import OS_KEY_DOWN_MASK, OS_VIRTUAL_KEYS


def os_key_down(name):
    """Whether Windows reports the key `name` (a Keys name) physically down, or None when it cannot tell."""
    code = OS_VIRTUAL_KEYS.get(name)
    if code is None:
        return None
    try:
        import ctypes
        return bool(ctypes.windll.user32.GetAsyncKeyState(code) & OS_KEY_DOWN_MASK)
    except Exception:
        return None
