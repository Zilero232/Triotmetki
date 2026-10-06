from __future__ import absolute_import, division, print_function, unicode_literals

# While the modifier is held its release is also polled: Alt+Tab or a client dialog can swallow the key-up.
RELEASE_POLL_S = 0.25

# Key names -> Windows virtual-key codes (WinUser.h VK_LSHIFT 0xA0 ... VK_RMENU 0xA5). BigWorld keeps a key down that
# was released while the game was in the background (Alt+Tab: the Alt key-up goes to the other window), so the
# modifier also asks Windows for the physical key and whether the game window is in front.
OS_VIRTUAL_KEYS = {
    'KEY_LSHIFT': 0xA0,
    'KEY_RSHIFT': 0xA1,
    'KEY_LCONTROL': 0xA2,
    'KEY_RCONTROL': 0xA3,
    'KEY_LALT': 0xA4,
    'KEY_RALT': 0xA5,
}
# GetAsyncKeyState: the most significant bit of the SHORT is set while the key is down.
OS_KEY_DOWN_MASK = 0x8000
