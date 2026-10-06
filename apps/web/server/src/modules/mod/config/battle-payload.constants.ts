export const MOD_SHOTS = {
  maxPerBattle: 200,
  maxDamage: 10_000,
  maxDistanceM: 1_500,
  shells: ['armor_piercing', 'armor_piercing_cr', 'hollow_charge', 'high_explosive', 'unknown'],
  outcomes: ['damage', 'no_damage', 'miss']
} as const;

export const MOD_ACHIEVEMENTS = {
  maxPerBattle: 64,
  maxNameLength: 64
} as const;

export const MOD_PLATOON = {
  minSize: 2,
  maxSize: 3
} as const;

export const MOD_BATTLE_LIMITS = {
  stats: {
    damage_dealt: 30_000,
    damage_assisted_radio: 40_000,
    damage_assisted_track: 40_000,
    damage_assisted_stun: 40_000,
    damage_blocked: 60_000,
    spotted: 30,
    frags: 30,
    damaged: 30,
    shots: 2_000,
    direct_hits: 2_000,
    direct_enemy_hits: 2_000,
    piercings: 2_000,
    piercing_enemy_hits: 2_000,
    xp: 100_000,
    original_xp: 20_000,
    free_xp: 20_000,
    life_time_s: 3_600,
    repair_cost: 500_000,
    ammo_cost: 500_000,
    consumables_cost: 200_000
  },
  arena: {
    arena_type_id: 2_147_483_647,
    bonus_type: 1_023,
    gui_type: 1_023,
    finish_reason: 255
  },
  credits: 2_000_000,
  durationSeconds: 3_600,
  queueSeconds: 86_400
} as const;
