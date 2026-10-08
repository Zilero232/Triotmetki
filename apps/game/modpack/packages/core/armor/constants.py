from __future__ import absolute_import, division, print_function, unicode_literals

import math

# RU 1.45 vehicle_systems.tankStructure.TankPartIndexes: CHASSIS 0, HULL 1, TURRET 2, GUN 3. A collision index past
# TankPartNames.ALL is a track pair (vehicle_systems.model_assembler.collisionIdxToTrackPairIdx) or a wheel.
PART_CHASSIS = 'chassis'
PART_HULL = 'hull'
PART_TURRET = 'turret'
PART_GUN = 'gun'
PART_TRACK = 'track'
PART_NAMES = (PART_CHASSIS, PART_HULL, PART_TURRET, PART_GUN)

# What a plate is along a ray: the armour that takes the hit (vehicleDamageFactor > 0) or one that only eats
# penetration (vehicleDamageFactor 0): a screen, a track or wheel, the gun.
KIND_MAIN = 'main'
KIND_SPACED = 'spaced'
KIND_TRACK = 'track'
KIND_GUN = 'gun'
SPACED_KIND_BY_PART = {PART_TRACK: KIND_TRACK, PART_CHASSIS: KIND_TRACK, PART_GUN: KIND_GUN}

# RU 1.45 gun_marker_ctrl._CrosshairShotResults._computePenetrationArmor: the angle never reaches 90 degrees and the
# cosine never drops below this.
MAX_HIT_ANGLE = math.pi / 2.0 - 1e-05
MIN_HIT_COS = 1e-05
# The effective armour a reading shows at most; a grazing hit is "more than" this.
MAX_EFFECTIVE_MM = 999

# RU 1.45 gun_marker_ctrl._CrosshairShotResults: two calibres over the plate widen the normalisation by
# 1.4 * calibre / (2 * armour); a plate under a third of the calibre never ricochets (3-calibre overmatch).
NORMALIZATION_CALIBERS = 2.0
NORMALIZATION_FACTOR = 1.4
OVERMATCH_CALIBERS = 3.0
# A HEAT jet's start: the plate it left, its nominal armour in metres past the hit (armor * 0.001).
MM_PER_M = 1000.0

SHELL_AP = 'ARMOR_PIERCING'
SHELL_APCR = 'ARMOR_PIERCING_CR'
SHELL_APFSDS = 'ARMOR_PIERCING_FSDS'
SHELL_APHE = 'ARMOR_PIERCING_HE'
SHELL_HEAT = 'HOLLOW_CHARGE'
SHELL_HE = 'HIGH_EXPLOSIVE'
SHELL_FLAME = 'FLAME'
SHELL_KINDS = (SHELL_AP, SHELL_APCR, SHELL_APFSDS, SHELL_APHE, SHELL_HEAT, SHELL_HE, SHELL_FLAME)

# The client's own rules, per shell kind, as the reticle's shot result reads them in the hangar's absence of battle
# modifiers. Normalisation and ricochet angles: RU 1.45 gui/battle_control/arena_visitor._ArenaModifiersVisitor
# defaults (the client never reads normalizationAngle / ricochetAngle from the shells: items/vehicles._readShell skips
# them on IS_CLIENT). Whether the kind may ricochet, checks the calibre for it and loses penetration per metre after a
# plate: gun_marker_ctrl._CrosshairShotResults._SHELL_EXTRA_DATA. None as the ricochet angle: never ricochets.
SHELL_RULES = {
    SHELL_AP: {'normalization': 5.0, 'ricochet': 70.0, 'caliber_ricochet': True, 'jet_loss_per_m': 0.0},
    SHELL_APCR: {'normalization': 2.0, 'ricochet': 70.0, 'caliber_ricochet': True, 'jet_loss_per_m': 0.0},
    SHELL_APFSDS: {'normalization': 2.0, 'ricochet': 80.0, 'caliber_ricochet': True, 'jet_loss_per_m': 0.0},
    SHELL_APHE: {'normalization': 0.0, 'ricochet': None, 'caliber_ricochet': False, 'jet_loss_per_m': 0.0},
    SHELL_HEAT: {'normalization': 0.0, 'ricochet': 85.0, 'caliber_ricochet': False, 'jet_loss_per_m': 0.5},
    SHELL_HE: {'normalization': 0.0, 'ricochet': None, 'caliber_ricochet': False, 'jet_loss_per_m': 0.0},
    SHELL_FLAME: {'normalization': 0.0, 'ricochet': None, 'caliber_ricochet': False, 'jet_loss_per_m': 0.0},
}

# RU 1.45 items/components/component_constants: a modern HE shell with shieldPenetration spends three times a screen's
# armour on it (MODERN_HE_PIERCING_POWER_REDUCTION_FACTOR_FOR_SHIELDS); one without stops on the first screen.
MODERN_HE_SHIELD_FACTOR = 3.0

# RU 1.45 gun_marker_ctrl._computePiercingPowerAtDistImpl: the penetration at 100 m holds to 100 m, then falls
# linearly to the 500 m value, and is nothing past the shot's range.
NEAR_DISTANCE_M = 100.0
FAR_DISTANCE_M = 500.0

# The penetration roll. The game rolls within +-25 % of the shell's penetration (the site's default "Lesta" rule,
# packages/gamedata PENETRATION.randomness); the chance inside the band is the site's model too: a normal distribution
# with sigma = half the band, cut at its edges (PENETRATION.sigmaShare). The client's reticle colours a narrower band
# (half of the shell's piercingPowerRandomization), which says "likely", not "possible".
PENETRATION_RANDOMNESS = 0.25
CHANCE_SIGMA_SHARE = 0.5

VERDICT_ALWAYS = 'always'
VERDICT_CHANCE = 'chance'
VERDICT_NEVER = 'never'
VERDICT_RICOCHET = 'ricochet'
VERDICT_NO_ARMOUR = 'no_armour'

OUTCOME_MAIN = 'main'
OUTCOME_RICOCHET = 'ricochet'
OUTCOME_STOPPED = 'stopped'
OUTCOME_NO_MAIN = 'no_main'
