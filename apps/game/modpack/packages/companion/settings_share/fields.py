from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import CLIENTS, GRAPHICS_OPTIONS, GUN_MARKERS, MARKER_FIELDS, PRESETS, WINDOW_MODES, ZOOM_STEPS

BOOL = ('bool',)
TEXT = ('text',)


def _int(low, high):
    return ('int', low, high)


def _enum(choices):
    return ('enum', choices)


def _enum_list(choices):
    return ('enum_list', choices)


SENSITIVITY = ('num', 0.01, 3.0)
VOLUME = _int(0, 100)

FIELDS = (
    ('resolution', 'display', 'resolution', ('resolution',)),
    ('refreshRate', 'display', 'refreshRate', _int(30, 540)),
    ('windowMode', 'display', 'windowMode', _enum(WINDOW_MODES)),
    ('graphicsClient', 'display', 'client', _enum(CLIENTS)),
    ('graphicsPreset', 'display', 'preset', _enum(PRESETS)),
    ('graphicsOverrides', 'display', 'overrides', ('text_map', GRAPHICS_OPTIONS)),
    ('fpsCap', 'display', 'fpsCap', _int(0, 1000)),
    ('vsync', 'display', 'vsync', BOOL),
    ('tripleBuffering', 'display', 'tripleBuffering', BOOL),
    ('fov', 'camera', 'fov', _int(70, 120)),
    ('dynamicFov', 'camera', 'dynamicFov', ('fov_range', 70, 120)),
    ('postMortem', 'camera', 'postMortem', BOOL),
    ('sniperDynamicCamera', 'camera', 'sniperDynamicCamera', BOOL),
    ('horizontalStabilisation', 'camera', 'horizontalStabilisation', BOOL),
    ('arcadeSens', 'controls', 'sensitivity.arcade', SENSITIVITY),
    ('sniperSens', 'controls', 'sensitivity.sniper', SENSITIVITY),
    ('artillerySens', 'controls', 'sensitivity.artillery', SENSITIVITY),
    ('invert', 'controls', 'invert', BOOL),
    ('zoomSteps', 'zoom', 'steps', _enum_list(ZOOM_STEPS)),
    ('arcadeReticle', 'sight', 'arcade.reticle', TEXT),
    ('arcadeGunMarker', 'sight', 'arcade.gunMarker', _enum(GUN_MARKERS)),
    ('arcadeSightColour', 'sight', 'arcade.colour', TEXT),
    ('sniperReticle', 'sight', 'sniper.reticle', TEXT),
    ('sniperGunMarker', 'sight', 'sniper.gunMarker', _enum(GUN_MARKERS)),
    ('sniperSightColour', 'sight', 'sniper.colour', TEXT),
    ('enemyMarkers', 'markers', 'enemy.base', _enum_list(MARKER_FIELDS)),
    ('enemyMarkersAlt', 'markers', 'enemy.alt', _enum_list(MARKER_FIELDS)),
    ('allyMarkers', 'markers', 'ally.base', _enum_list(MARKER_FIELDS)),
    ('allyMarkersAlt', 'markers', 'ally.alt', _enum_list(MARKER_FIELDS)),
    ('destroyedMarkers', 'markers', 'destroyed.base', _enum_list(MARKER_FIELDS)),
    ('destroyedMarkersAlt', 'markers', 'destroyed.alt', _enum_list(MARKER_FIELDS)),
    ('minimapSize', 'minimap', 'size', _int(0, 10)),
    ('minimapTransparency', 'minimap', 'transparency', VOLUME),
    ('minimapViewRange', 'minimap', 'viewRangeCircles', BOOL),
    ('minimapDrawRange', 'minimap', 'drawRangeCircle', BOOL),
    ('minimapSpgSector', 'minimap', 'spgFireSector', BOOL),
    ('volumeMaster', 'sound', 'master', VOLUME),
    ('volumeMusic', 'sound', 'music', VOLUME),
    ('volumeEffects', 'sound', 'effects', VOLUME),
    ('volumeVoice', 'sound', 'voice', VOLUME),
    ('sixthSenseSound', 'sound', 'sixthSenseSound', TEXT),
    ('voicePack', 'sound', 'voicePack', TEXT),
    ('damagePanel', 'battleUi', 'damagePanel', TEXT),
    ('damageLog', 'battleUi', 'damageLog', BOOL),
    ('efficiencyRibbons', 'battleUi', 'efficiencyRibbons', BOOL),
    ('sixthSenseIcon', 'battleUi', 'sixthSenseIcon', TEXT),
)

BY_RAW = {entry[0]: entry for entry in FIELDS}
BY_PATH = {(entry[1], entry[2]): entry for entry in FIELDS}
