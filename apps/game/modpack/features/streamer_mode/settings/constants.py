from __future__ import absolute_import, division, print_function, unicode_literals

from ..model.constants import HOTKEY_CHOICES

SWITCH = 'streamer_mode'
SECTION = 'streamer_mode'
GROUP = 'battle'

DEFAULTS = {
    'hotkey': 'ctrl_shift_h',
    'keep_hidden': False,
    'private': False,
    'hide_chat': True,
    'hide_hangar_stats': True,
}
CHOICES = {'hotkey': HOTKEY_CHOICES}

ADVANCED = ('keep_hidden',)
