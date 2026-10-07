from __future__ import absolute_import, division, print_function, unicode_literals

# Python 2's json.dumps with indent keeps the default ', ' item separator, which leaves a space at every line end.
PRETTY = {'sort_keys': True, 'indent': 2, 'ensure_ascii': False, 'separators': (',', ': ')}
# Python 2.7's C encoder runs only without sort_keys and indent.
COMPACT = {'separators': (',', ':'), 'ensure_ascii': True}
# MoveFileExW flags (winbase.h): MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH.
MOVE_REPLACE_FLAGS = 0x1
MOVE_WRITE_THROUGH = 0x8
TEMP_SUFFIX = '.tmp'
