import type { MyModeRow } from '../lib/my-mode-stats';
import type { MyModeBattleRow } from './my-mode-stats.types';

import { gameModeOfBonusType } from '../../reference';

export const toMyModeRows = (rows: readonly MyModeBattleRow[]): MyModeRow[] =>
  rows.flatMap((row): MyModeRow[] => {
    const mode = gameModeOfBonusType(row.battle_type);

    if (!mode || mode === 'random') {
      return [];
    }

    return [
      {
        mode,
        tankId: row.tank_id,
        battles: row.battles,
        wins: row.wins,
        decided: row.decided,
        damage: row.damage,
        xp: row.xp,
        frags: row.frags,
        survived: row.survived,
        survivalKnown: row.survival_known,
        lastBattleAt: row.last_battle_at
      }
    ];
  });
