from __future__ import absolute_import, division, print_function, unicode_literals


WIDGET_VERSION = 1

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
