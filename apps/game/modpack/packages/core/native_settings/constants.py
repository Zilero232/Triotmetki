from __future__ import absolute_import, division, print_function, unicode_literals

NATIVE = 'native'
ON = 'on'
OFF = 'off'
TRI_STATE = (NATIVE, ON, OFF)

# state.json key of the client values a component replaced when the player asked for its recommended values, per
# component (the card's restore point).
BACKUP_STATE_KEY = 'native_backup'
# state.json key of the one-time presets older builds wrote on a fresh install without asking (dropped on load).
RETIRED_STAMP_STATE_KEY = 'native_initial_applied'
ACTION_RESTORE = 'native_restore'
ACTION_RECOMMENDED = 'native_recommended'
