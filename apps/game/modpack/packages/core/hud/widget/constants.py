from __future__ import absolute_import, division, print_function, unicode_literals

import re

# The payload version of a widget; the page drops a widget whose kind or version it does not know and draws `text`.
WIDGET_VERSION = 1

# Colour roles the page maps to its palette (docs/specs/2026-09-29-hud-visual-redesign.md section 4.4).
TONES = (
    'text',
    'muted',
    'dim',
    'ally',
    'enemy',
    'gold',
    'accent',
    'radio',
    'track',
    'stun',
    'blocked',
    'received',
    'success',
    'warning',
    'good',
    'bad',
)

# The shared plate (`card`): a row's status mark the page draws as a glyph, and the lengths the page gets at most.
CARD_KIND = 'card'
STATUSES = ('active', 'done', 'honors', 'failed', 'idle')
CARD_LIMITS = {
    'title': 48,
    'text': 64,
    'value': 24,
    'detail': 120,
    'rows': 12,
    'chips': 6,
    'strip': 12,
    'width': (120, 420),
}
HEX_COLOR = re.compile(r'^#[0-9A-Fa-f]{6}$')

# The optional keywords of `card_row` and `card` with their defaults.
ROW_OPTIONS = {
    'icon': None,
    'status': None,
    'label': None,
    'note': None,
    'detail': None,
    'progress': None,
    'tone_name': 'text',
    'text_tone': 'text',
    'progress_tone': 'accent',
    'color': None,
}
CARD_OPTIONS = {
    'subtitle': None,
    'value': None,
    'value_tone': 'text',
    'chips': (),
    'strip': (),
    'footer': None,
    'width': None,
}
