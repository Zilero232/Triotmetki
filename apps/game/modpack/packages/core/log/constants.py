from __future__ import absolute_import, division, print_function, unicode_literals

PREFIX = '[OTMETKI]'
# A handler that starts failing on every battle event (hundreds of calls a minute after a client patch)
# writes its traceback once per window, then one line with the count of the identical ones held back.
REPEAT_WINDOW_S = 60.0
MAX_TRACKED_ERRORS = 200
# The mod's own log next to its settings (mods/configs/otmetki): python.log is rewritten on every client start, so a
# session that ended in a crash or a restart leaves nothing there. This session plus the two before it, 1 MB a file.
FILE_NAME = 'otmetki.log'
FILE_KEEP = 3
FILE_MAX_BYTES = 1 << 20
FILE_PENDING_LINES = 500
# A crash loses at most this much of the log that was not an error (errors are flushed at once).
FILE_FLUSH_S = 1.0
