from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: the client reads Shift and Ctrl on either side (KEY_LSHIFT or KEY_RSHIFT).
EITHER_SIDE = {
    'KEY_LCONTROL': 'KEY_RCONTROL',
    'KEY_LSHIFT': 'KEY_RSHIFT',
    'KEY_LALT': 'KEY_RALT',
}
