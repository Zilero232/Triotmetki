from __future__ import absolute_import, division, print_function, unicode_literals

PRETTY = {'sort_keys': True, 'indent': 2, 'ensure_ascii': False}
# MoveFileExW flags (winbase.h): MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH.
MOVE_REPLACE_FLAGS = 0x1 | 0x8
