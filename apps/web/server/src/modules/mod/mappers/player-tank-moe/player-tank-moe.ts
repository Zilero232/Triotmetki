import type { Prisma } from '../../../../../generated';
import type { ToPlayerTankMoeInput } from './player-tank-moe.types';

import { moePercent } from '../../lib/battle';

export const toPlayerTankMoe = ({ moe, previousMarks }: ToPlayerTankMoeInput) =>
  ({
    marksOnGun: moe.marks_on_gun,
    ...(previousMarks === moe.marks_on_gun ? {} : { marksSource: 'mod' as const }),
    moePercent: moePercent(moe.damage_rating),
    moeMovingDamage: moe.moving_avg_damage,
    moeUpdatedAt: new Date()
  }) satisfies Prisma.PlayerTankUpdateInput;
