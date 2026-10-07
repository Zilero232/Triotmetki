from __future__ import absolute_import, division, print_function, unicode_literals

DEFAULT_MODIFIER = 'alt'

MODIFIERS = {
    'alt': (('KEY_LALT', 'KEY_RALT'),),
    'ctrl_alt': (('KEY_LCONTROL', 'KEY_RCONTROL'), ('KEY_LALT', 'KEY_RALT')),
    'ctrl': (('KEY_LCONTROL', 'KEY_RCONTROL'),),
    'shift': (('KEY_LSHIFT', 'KEY_RSHIFT'),),
}
MODIFIER_CHOICES = ('alt', 'ctrl_alt', 'ctrl', 'shift')
