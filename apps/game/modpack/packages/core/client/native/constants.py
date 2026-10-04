from __future__ import absolute_import, division, print_function, unicode_literals

# The app attribute holding the one NativeState the client-settings components share (core.client.native.defaults).
STATE_ATTR = '_otmetki_native_state'

# The client's detection-lamp sound (account_helpers/settings_core/options.py DetectionAlertSound, RU 1.45): an
# AccountSetting whose index picks from _WWISE_EVENTS = ('lightbulb', 'lightbulb_02', 'sixthSense'); 'sixthSense' is
# the user sound, played only when SoundGroups.prepareMP3 finds `file`.
DETECTION_SOUND = {
    'setting': 'bulbVoices',
    'stock_index': 0,
    'user_index': 2,
    'file': 'audioww/sixthSense.mp3',
}
