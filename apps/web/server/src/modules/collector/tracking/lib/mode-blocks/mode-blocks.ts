import { isPlainObject, sumBy } from 'remeda';

import type { BattleStatsBlock } from '../../../../../lib/lesta';
import type { ModeBlockOfInput } from './mode-blocks.types';

const weighted = (blocks: readonly BattleStatsBlock[], pick: (block: BattleStatsBlock) => number | undefined): number | undefined => {
  const known = blocks.filter((block) => pick(block) !== undefined);
  const battles = sumBy(known, (block) => block.battles);

  if (battles === 0) {
    return undefined;
  }

  return sumBy(known, (block) => (pick(block) ?? 0) * block.battles) / battles;
};

const highest = (blocks: readonly BattleStatsBlock[], pick: (block: BattleStatsBlock) => number | undefined): number | undefined => {
  const values = blocks.flatMap((block) => {
    const value = pick(block);

    return value === undefined ? [] : [value];
  });

  return values.length === 0 ? undefined : Math.max(...values);
};

export const mergeBlocks = (blocks: readonly BattleStatsBlock[]): BattleStatsBlock | null => {
  const played = blocks.filter((block) => block.battles > 0);

  if (played.length === 0) {
    return null;
  }

  const sum = (pick: (block: BattleStatsBlock) => number) => sumBy(played, pick);

  return {
    battles: sum((block) => block.battles),
    wins: sum((block) => block.wins),
    losses: sum((block) => block.losses),
    draws: sum((block) => block.draws),
    xp: sum((block) => block.xp),
    damage_dealt: sum((block) => block.damage_dealt),
    damage_received: sum((block) => block.damage_received),
    frags: sum((block) => block.frags),
    spotted: sum((block) => block.spotted),
    capture_points: sum((block) => block.capture_points),
    dropped_capture_points: sum((block) => block.dropped_capture_points),
    hits: sum((block) => block.hits),
    shots: sum((block) => block.shots),
    survived_battles: sum((block) => block.survived_battles),
    avg_damage_blocked: weighted(played, (block) => block.avg_damage_blocked),
    avg_damage_assisted: weighted(played, (block) => block.avg_damage_assisted),
    max_damage: highest(played, (block) => block.max_damage),
    max_xp: highest(played, (block) => block.max_xp),
    max_frags: highest(played, (block) => block.max_frags)
  };
};

const isBlock = (value: unknown): value is BattleStatsBlock => isPlainObject(value) && typeof value.battles === 'number';

export const modeBlockOf = ({ source, keys }: ModeBlockOfInput): BattleStatsBlock | null =>
  mergeBlocks(
    keys.flatMap((key) => {
      const value = source[key];

      return isBlock(value) ? [value] : [];
    })
  );
