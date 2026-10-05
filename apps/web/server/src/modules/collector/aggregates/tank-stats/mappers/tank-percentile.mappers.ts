import type { Prisma } from '../../../../../../generated';
import type { ToTankPercentileRecordInput } from './tank-percentile.types';

import { toJsonValue } from '../../../../../common/lib';
import { BRONYA_REFERENCE, bronyaReferencePayload } from '../../../../reference';

export const toTankPercentileRecord = ({ row, date }: ToTankPercentileRecordInput): Prisma.TankPercentileCreateManyInput => ({
  tankId: row.tank_id,
  date,
  distribution: BRONYA_REFERENCE.distribution,
  percentiles: toJsonValue(
    bronyaReferencePayload({
      players: row.players,
      components: { damage: row.damage, winRate: row.win_rate, frags: row.frags, spotted: row.spotted, defence: row.defence }
    })
  )
});
