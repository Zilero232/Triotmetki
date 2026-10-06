from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: gui/game_control/hangar_switch_controller.py. IHangarSpaceSwitchController keeps
# currentSceneName (constants.DEFAULT_HANGAR_SCENE outside event and mode hangars) and _defaultHangarSpaceConfig, whose
# setSpaceIdOverride(isPremium, path) / discardSpaceIdOverride(isPremium) the server's cmd_change_hangar notifications
# use for event hangars (its _spaceIdOverride dict holds them); processPossibleSceneChange() reloads the space it
# names. gui.ClientHangarSpace._HANGAR_CFGS maps every space path to its config once the lobby read them.
CONTROLLER_SKELETON = ('skeletons.gui.game_control', 'IHangarSpaceSwitchController')
DEFAULT_CONFIG_ATTR = '_defaultHangarSpaceConfig'
OVERRIDES_ATTR = '_spaceIdOverride'
HANGAR_CONFIGS = ('gui.ClientHangarSpace', '_HANGAR_CFGS')
DEFAULT_SCENE = ('constants', 'DEFAULT_HANGAR_SCENE')
HANGAR_SPACE_SKELETON = ('skeletons.gui.shared.utils', 'IHangarSpace')
# IHangarSpace.onSpaceCreate fires once a space finished loading; the switch controller itself waits for it
# (onLobbyInited -> _delayedProcessChange) before it reloads a space.
SPACE_CREATED = 'onSpaceCreate'

# RU 1.45 client files: spaces/<folder>/environments/environments.xml holds <activeEnvironment> and one <environment>
# per GUID (dotted: 2F6C0AAA.490E4615.008EB7B0.9F58C206), each in the folder <GUID with dashes>/environment.xml whose
# top-level <name> is what EnvironmentSwitcher and the customization view address it by. ResMgr reads them from the
# mounted packages, a mod's own space folder included.
ENVIRONMENTS_XML = '%s/environments/environments.xml'
ENVIRONMENT_XML = '%s/environments/%s/environment.xml'
ACTIVE_ENVIRONMENT = 'activeEnvironment'
ENVIRONMENT_ENTRY = 'environment'
ENVIRONMENT_NAME = 'name'
# RU 1.45 client source: DefaultHangarSpaceConfig.getEnvironment / setEnvironment / discardEnvironment (per premium
# flag, '' = none) is the environment slot of the default hangar; changeHangarSpace passes it to
# BigWorld.addSpaceGeometryMapping when the space loads. An environment-only change of the loaded space is
# BigWorld.EnvironmentSwitcher.instance().setMainEnvironment(name, tryActivate=True)
# (HangarSpaceSwitchController.__updateEnvironmentForCurrentScene).
ENVIRONMENT_SWITCHER = 'EnvironmentSwitcher'

# The default hangar config keeps one slot of each kind per premium flag.
PREMIUM_FLAGS = (True, False)
