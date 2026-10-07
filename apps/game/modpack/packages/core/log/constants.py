from __future__ import absolute_import, division, print_function, unicode_literals

PREFIX = '[OTMETKI]'
REPEAT_WINDOW_S = 60.0
MAX_TRACKED_ERRORS = 200
# The client rewrites python.log on every start.
FILE_NAME = 'otmetki.log'
FILE_KEEP = 3
FILE_MAX_BYTES = 1 << 20
FILE_PENDING_LINES = 500
FILE_FLUSH_S = 1.0
