from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'battle_chat_filter'
SECTION = 'chat_filter'
GROUP = 'battle'
MAX_WORDS = 500

TIMESTAMP_FORMATS = ('', '%H:%M', '%H:%M:%S')

DEFAULTS = {
    'timestamp_format': '%H:%M:%S',
    'filter_duplicates': True,
    'rate_limit': 4,
    'filter_commands': True,
    'block_words': '',
}

CHOICES = {'timestamp_format': TIMESTAMP_FORMATS}

LIMITS = {'rate_limit': (0, 20)}

FIXED = {'duplicate_window_s': 30, 'rate_window_s': 10}
ADVANCED = ('rate_limit', 'filter_commands')
