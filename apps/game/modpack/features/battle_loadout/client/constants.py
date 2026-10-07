from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: OptionalDevicesController and AmmoController.updateForNewSetup events.
DEVICE_EVENTS = ('onDescriptorDevicesChanged', 'onOptionalDeviceAdded', 'onOptionalDeviceUpdated')
SETUP_EVENT = 'onGunSettingsSet'
# RU 1.45 client_common/ClientArena.py: the own entry may come after the avatar is ready.
VEHICLE_UPDATED_EVENT = 'onVehicleUpdated'
PERIOD_EVENT = 'onPeriodChange'

NO_VEHICLE = 'the own vehicle is not in the arena list yet'
NOTHING_INSTALLED = 'the own vehicle has no equipment and no directives'

SOURCE_SETUPS = 'setups'
SOURCE_ARENA = 'arena'
