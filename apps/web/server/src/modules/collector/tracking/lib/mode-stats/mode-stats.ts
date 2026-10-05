import { entries } from 'remeda';

import type { AccountModeRow, AccountModeRowsInput, TankModeRow, TankModeRowsInput } from './mode-stats.types';

import { modeBlockOf } from '../mode-blocks/mode-blocks';
import { ACCOUNT_MODE_SOURCES, TANK_MODE_SOURCES } from '../mode-blocks/mode-blocks.constants';

export const accountModeRows = ({ accountId, statistics }: AccountModeRowsInput): AccountModeRow[] =>
  entries(ACCOUNT_MODE_SOURCES).flatMap(([mode, keys]) => {
    const block = modeBlockOf({ source: statistics, keys });

    if (!block) {
      return [];
    }

    return [
      {
        accountId,
        mode,
        battles: block.battles,
        wins: block.wins,
        losses: block.losses,
        draws: block.draws,
        damageDealt: BigInt(block.damage_dealt),
        damageReceived: BigInt(block.damage_received),
        frags: block.frags,
        spotted: block.spotted,
        xp: BigInt(block.xp),
        survived: block.survived_battles,
        hits: block.hits,
        shots: block.shots,
        capturePoints: block.capture_points,
        droppedCapturePoints: block.dropped_capture_points,
        avgDamageBlocked: block.avg_damage_blocked ?? 0,
        avgDamageAssisted: block.avg_damage_assisted ?? null,
        maxDamage: block.max_damage ?? null,
        maxXp: block.max_xp ?? null,
        maxFrags: block.max_frags ?? null
      }
    ];
  });

export const tankModeRows = ({ accountId, stats }: TankModeRowsInput): TankModeRow[] =>
  stats.flatMap((stat) =>
    entries(TANK_MODE_SOURCES).flatMap(([mode, keys]) => {
      const block = modeBlockOf({ source: stat, keys });

      if (!block) {
        return [];
      }

      return [
        {
          accountId,
          tankId: stat.tank_id,
          mode,
          battles: block.battles,
          wins: block.wins,
          damageDealt: block.damage_dealt,
          frags: block.frags,
          spotted: block.spotted,
          xp: block.xp,
          survived: block.survived_battles
        }
      ];
    })
  );
