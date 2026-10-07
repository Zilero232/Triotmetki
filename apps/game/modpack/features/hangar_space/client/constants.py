from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: gui/game_control/hangar_switch_controller.py IHangarSpaceSwitchController.
CONTROLLER_SKELETON = ('skeletons.gui.game_control', 'IHangarSpaceSwitchController')
DEFAULT_CONFIG_ATTR = '_defaultHangarSpaceConfig'
OVERRIDES_ATTR = '_spaceIdOverride'
HANGAR_CONFIGS = ('gui.ClientHangarSpace', '_HANGAR_CFGS')
# gui.ClientHangarSpace.getDefaultHangarPath(isPremium): the regular hangar (spaces/h08_mt_hangar).
DEFAULT_HANGAR_PATH = ('gui.ClientHangarSpace', 'getDefaultHangarPath')
DEFAULT_SCENE = ('constants', 'DEFAULT_HANGAR_SCENE')
HANGAR_SPACE_SKELETON = ('skeletons.gui.shared.utils', 'IHangarSpace')
# IHangarSpace.onSpaceCreate fires once a space finished loading (onLobbyInited -> _delayedProcessChange).
SPACE_CREATED = 'onSpaceCreate'

# RU 1.45 client files: spaces/<folder>/environments/environments.xml lists the environments.
ENVIRONMENTS_XML = '%s/environments/environments.xml'
ENVIRONMENT_XML = '%s/environments/%s/environment.xml'
ACTIVE_ENVIRONMENT = 'activeEnvironment'
ENVIRONMENT_ENTRY = 'environment'
ENVIRONMENT_NAME = 'name'
# RU 1.45 client source: DefaultHangarSpaceConfig.getEnvironment / setEnvironment / discardEnvironment.
ENVIRONMENT_SWITCHER = 'EnvironmentSwitcher'

# RU 1.45 client source: BigWorld.screenShot(extension, name), res/engine_config.xml screenShot.
SHOT_EXTENSION = 'bmp'
SHOT_FOLDER = 'capture'
SHOT_NAME = 'shot'
PERSONALITY_MODULE = 'gui.shared.personality'
PERSONALITY_CALLBACK = 'onScreenShotMade'
# RU 1.45 gui/game_control/overlay.py _LAYERS: hideContainers / showContainers with no animation.
HIDE_SETTLE_S = 0.4
SHOT_TIMEOUT_S = 3.0
PREVIEW_CHECK_S = 0.5
