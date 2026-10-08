from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: the hangar's camera manager (a CGF manager of the hangar space) and the vehicle preview.
CAMERA_MANAGER_MODULE = 'cgf_components.hangar_camera_manager'
CAMERA_MANAGER_CLASS = 'HangarCameraManager'
PREVIEW_MODULE = 'CurrentVehicle'
PREVIEW_NAME = 'g_currentPreviewVehicle'
# The selected vehicle comes back a few frames after selectNoVehicle(); the camera is reset then, or after this long.
RESTORE_WAIT_S = 4.0
