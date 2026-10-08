from __future__ import absolute_import, division, print_function, unicode_literals

HOTKEYS = {
    'none': (None, ()),
    'ctrl_shift_h': ('KEY_H', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'ctrl_shift_s': ('KEY_S', ('KEY_LCONTROL', 'KEY_LSHIFT')),
    'f9': ('KEY_F9', ()),
    'f10': ('KEY_F10', ()),
    'f11': ('KEY_F11', ()),
}
HOTKEY_CHOICES = ('ctrl_shift_h', 'ctrl_shift_s', 'f9', 'f10', 'f11', 'none')

PRIVATE_HANGAR_LABELS = (
    'otmetki.session',
    'otmetki.personal_missions',
)
PRIVATE_HUD_PANELS = ('hangar_marks',)
