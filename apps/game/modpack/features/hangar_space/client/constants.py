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
# gui.ClientHangarSpace.getDefaultHangarPath(isPremium): the regular hangar of gui/hangars.xml (spaces/h08_mt_hangar).
DEFAULT_HANGAR_PATH = ('gui.ClientHangarSpace', 'getDefaultHangarPath')
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

# The preview shot. RU 1.45 client source: BigWorld.screenShot(extension, name) is the engine's screenshot (the
# client's own key writes res/engine_config.xml screenShot: extension 'jpg', name 'screenshots/shot', a path under
# the game folder to which the engine adds a number); the engine reports each saved file to the one callback set
# with BigWorld.setScreenshotNotifyCallback(callback(path)), which gui.shared.personality.init sets to its
# onScreenShotMade (the screenshot-saved system message). The shot takes it for one capture and gives
# it back. UNVERIFIED on Lesta 1.45: the 'bmp' extension, a name in another folder, the callback for a scripted shot.
SHOT_EXTENSION = 'bmp'
SHOT_FOLDER = 'capture'
SHOT_NAME = 'shot'
PERSONALITY_MODULE = 'gui.shared.personality'
PERSONALITY_CALLBACK = 'onScreenShotMade'
# The interface is taken off the screen the way the client's overlay controller does it (gui/game_control/overlay.py
# _LAYERS, hideContainers / showContainers on the lobby app's containerManager), with no animation; a window of ours
# that is not blocking is hidden through the wulf window's hide() / show(focus=False). The HUD page is no window: it
# sits inside the hangar view (core.client.hud.inject_page). UNVERIFIED on Lesta 1.45: that it leaves the shot. The
# shot waits HIDE_SETTLE_S for the next frames to draw without them and gives the interface back when the engine
# reports the file, or after SHOT_TIMEOUT_S at the latest.
HIDE_SETTLE_S = 0.4
SHOT_TIMEOUT_S = 3.0
PREVIEW_CHECK_S = 0.5
