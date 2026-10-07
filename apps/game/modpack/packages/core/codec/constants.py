from __future__ import absolute_import, division, print_function, unicode_literals

CANONICAL = {'sort_keys': True, 'separators': (',', ':'), 'ensure_ascii': True}
# Python 2 converts a JSON integer in quadratic time.
MAX_NUMBER_CHARS = 32
