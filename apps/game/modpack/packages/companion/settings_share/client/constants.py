from __future__ import absolute_import, division, print_function, unicode_literals

ACTION_EXPORT = 'export'

POLL_EVERY_S = 120.0
# Settings-core names (account_helpers/settings_core/settings_constants.py), checked against the RU 1.45
# client source; a name the core does not know reads as None and is dropped by the whitelist. The
# contract's camera.postMortem has no 1.45 setting (enablePostMortemEffect is gone; enablePostMortemDelay
# is a different option), so the mod never reads or writes it.
CORE_NAMES = {
    'fov': 'fov',
    'vsync': 'vertSync',
    'tripleBuffering': 'tripleBuffered',
    'sniperDynamicCamera': 'dynamicCamera',
    'horizontalStabilisation': 'horStabilizationSnp',
    'arcadeSens': 'mouseArcadeSens',
    'sniperSens': 'mouseSniperSens',
    'artillerySens': 'mouseStrategicSens',
    'invert': 'mouseVertInvert',
    'minimapViewRange': 'minimapViewRange',
    'minimapDrawRange': 'minimapDrawRange',
    'volumeMaster': 'masterVolume',
    'volumeMusic': 'musicVolume',
}
