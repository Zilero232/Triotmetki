from __future__ import absolute_import, division, print_function, unicode_literals

CANONICAL = {'sort_keys': True, 'separators': (',', ':'), 'ensure_ascii': True}
# Python 2 turns a JSON integer into a number in quadratic time: a million digits in a replay header froze the client
# for seconds (a 4 MB block for about a minute). No value we read is longer than this.
MAX_NUMBER_CHARS = 32
