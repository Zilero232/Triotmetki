from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: frameworks/wulf/gui_constants.py WindowLayer.
FOCUS_LAYERS = (4, 11)

# WindowFlags.TOOLTIP (48 | WINDOW) masked by WINDOW_TYPE_MASK: a tooltip never takes the keyboard.
TOOLTIP_TYPE = 49

BOUNCE_SECONDS = 0.5
MAX_BOUNCES = 3

FOCUS_HAND_ON = 'hand_on'
FOCUS_WAIT = 'wait'
FOCUS_GIVE_UP = 'give_up'
FOCUS_KEEP = 'keep'
