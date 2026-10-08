from __future__ import absolute_import, division, print_function, unicode_literals

import itertools

# RU 1.45 vehicle_systems.tankStructure.TankPartIndexes and the descriptor parts that hold each one's materials.
MATERIAL_PARTS = ('chassis', 'hull', 'turret', 'gun')

# RU 1.45 client source: where the client keeps what the probe reads.
TRACK_MODULE = 'vehicle_systems.model_assembler'
TRACK_PAIR_NAME = 'collisionIdxToTrackPairIdx'
CAMERAS_MODULE = 'AvatarInputHandler.cameras'
RAY_NAME = 'getWorldRayAndPoint'
PROJECT_NAME = 'projectPoint'
DISTANCE_FACTOR_MODULE = 'helpers_common'
DISTANCE_FACTOR_NAME = 'computeDistanceFactor'
PIERCE_FACTOR = 'pierceFactor'
MODERN_MECHANICS = 'MODERN'

# A screen ray runs this far from the camera's near plane: past any hangar camera's reach (the hangar orbit keeps
# within about 20 m).
RAY_LENGTH_M = 80.0

# The 8 corners of a part's bounds: CompoundModel.getBoundsForPart maps the unit cube onto the part's box in the
# world (RU 1.45 HangarVehicleAppearance.getCentralPointForArea reads its centre at (0.5, 0.5, 0.5)).
UNIT_CORNERS = tuple(itertools.product((0.0, 1.0), repeat=3))
