import type { BattleStatsBlock } from '../../../../../lib/lesta';
import type { CareerSource } from './career-source.types';

export const careerSourceFromBlock = (block: BattleStatsBlock): CareerSource => ({
  avgDamageAssisted: block.avg_damage_assisted ?? null,
  avgDamageAssistedRadio: block.avg_damage_assisted_radio ?? null,
  avgDamageAssistedTrack: block.avg_damage_assisted_track ?? null,
  avgDamageAssistedStun: block.avg_damage_assisted_stun ?? null,
  maxDamage: block.max_damage ?? null,
  maxDamageTankId: block.max_damage_tank_id ?? null,
  maxXp: block.max_xp ?? null,
  maxXpTankId: block.max_xp_tank_id ?? null,
  maxFrags: block.max_frags ?? null,
  maxFragsTankId: block.max_frags_tank_id ?? null
});
