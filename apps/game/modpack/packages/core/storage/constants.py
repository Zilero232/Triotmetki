from __future__ import absolute_import, division, print_function, unicode_literals

# Python 2's json.dumps with indent keeps the default ', ' item separator, which leaves a space at every line end.
PRETTY = {'sort_keys': True, 'indent': 2, 'ensure_ascii': False, 'separators': (',', ': ')}
# The compact files (hit books, the outbox, the state) are written on the game thread: Python 2.7's C encoder runs only
# without sort_keys and indent (4-5 times faster on a 2 MB hit book), and nothing compares their bytes.
COMPACT = {'separators': (',', ':'), 'ensure_ascii': True}
# MoveFileExW flags (winbase.h): MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH. Waiting for the disk is kept for the
# files a player cannot get back at all (the binding): the settings are mirrored in %APPDATA% anyway.
MOVE_REPLACE_FLAGS = 0x1
MOVE_WRITE_THROUGH = 0x8
TEMP_SUFFIX = '.tmp'
