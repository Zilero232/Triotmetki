from __future__ import absolute_import, division, print_function, unicode_literals

# frameworks/wulf/gui_constants.py (RU 1.45 client source): WindowLayer VIEW 4 ... TOP_WINDOW 10 are the layers of the
# client's own pages, windows and dialogs. Below VIEW are the root, the hidden service layout and the hangar markers;
# above TOP_WINDOW the overlay, IME, service layout, tooltip, cursor and waiting layers, none of which the stock GUI
# hands the keyboard to.
FOCUS_LAYERS = (4, 11)

# WindowFlags.TOOLTIP (48 | WINDOW) masked by WINDOW_TYPE_MASK: a tooltip is shown over a focused window and never
# takes the keyboard itself.
TOOLTIP_TYPE = 49

# A focus the client gives back to the HUD window this soon after it was handed on counts as a bounce; after this many
# bounces in a row the window keeps it rather than trading it with the client every frame.
BOUNCE_SECONDS = 0.5
MAX_BOUNCES = 3

FOCUS_HAND_ON = 'hand_on'
FOCUS_WAIT = 'wait'
FOCUS_GIVE_UP = 'give_up'
FOCUS_KEEP = 'keep'
