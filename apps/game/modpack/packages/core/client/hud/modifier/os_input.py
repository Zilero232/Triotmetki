from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import OS_KEY_DOWN_MASK, OS_VIRTUAL_KEYS


def _windows():
    try:
        import ctypes
        return ctypes, ctypes.windll.user32, ctypes.windll.kernel32
    except Exception:  # no ctypes or no windll: not Windows, the client's own key state is all there is
        return None


def os_key_down(name):
    """Whether Windows reports the key `name` (a Keys name) physically down, or None when it cannot tell."""
    code = OS_VIRTUAL_KEYS.get(name)
    found = _windows()
    if code is None or found is None:
        return None
    try:
        return bool(found[1].GetAsyncKeyState(code) & OS_KEY_DOWN_MASK)
    except Exception:
        return None


def game_in_front():
    """Whether the foreground window belongs to the game's process, or None when it cannot tell."""
    found = _windows()
    if found is None:
        return None
    ctypes, user32, kernel32 = found
    try:
        window = user32.GetForegroundWindow()
        if not window:
            return False
        process = ctypes.c_ulong(0)
        user32.GetWindowThreadProcessId(window, ctypes.byref(process))
        return process.value == kernel32.GetCurrentProcessId()
    except Exception:
        return None
