from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: crosshair/plugins.TargetDistancePlugin.__shouldTrackVehicle keeps the reticle distance only
# for the vehicles whose markers show no distance of their own (and for wrecks); the name is mangled by its class.
TRACK_METHOD = '_TargetDistancePlugin__shouldTrackVehicle'
# consumables_panel.ConsumablesPanel._makeShellTooltip(descriptor, gunSettings, intCD, damageMultiplier): the text of
# a shell slot, built when the slots are added.
SHELL_TOOLTIP_METHOD = '_makeShellTooltip'
# gun_marker_ctrl._DefaultGunMarkerController.update(markerType, pos, direction, sizeVector, relaxTime, collData) ends
# with `_dataProvider.updateSize(size, relaxTime)`; the replay records the size before that, so a replay keeps the
# real one.
MARKER_METHOD = 'update'
MARKER_RELAX_ARG = 4
