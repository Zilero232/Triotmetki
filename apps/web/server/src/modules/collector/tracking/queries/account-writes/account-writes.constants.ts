export const TANK_SNAPSHOT_COLUMNS = [
  'account_id',
  'tank_id',
  'mode',
  'captured_at',
  'battles',
  'wins',
  'losses',
  'draws',
  'damage_dealt',
  'damage_received',
  'frags',
  'spotted',
  'xp',
  'survived_battles',
  'hits',
  'shots',
  'capture_points',
  'dropped_capture_points',
  'avg_damage_blocked',
  'mark_of_mastery',
  'marks_on_gun',
  'max_frags',
  'max_xp'
] as const;

export const MODE_RECORD_COLUMNS = ['max_damage', 'max_xp', 'max_frags'] as const;
