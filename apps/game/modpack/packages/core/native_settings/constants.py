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
# state.json key of the components whose one-time client switch (ONCE) already ran, so it never runs again.
ONCE_STATE_KEY = 'native_once'
# config.json's keys the player set in the settings window (companion.config USER_SET_KEY), space-separated, a
# component value as `<section>.<key>`.
USER_SET_KEY = 'user_set'
# What a component's one-time client switch does (native_settings.initial.once_step): nothing yet (the client cannot
# be read), nothing ever (the player chose the value, or the game already holds it), write the section's value over the
# game's off value, or put the section back to 'native' while the game holds another value of its own.
ONCE_WAIT = 'wait'
ONCE_DONE = 'done'
ONCE_WRITE = 'write'
ONCE_NATIVE = 'native'
ACTION_RESTORE = 'native_restore'
ACTION_RECOMMENDED = 'native_recommended'
