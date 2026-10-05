import type { AggregateRow, RawTankRow } from '../lib/stat-line/stat-line.types';

export const toAggregateRow = (row: RawTankRow): AggregateRow => ({
  tankId: row.tank_id,
  battles: row.battles,
  wins: row.wins,
  damageDealt: row.damage,
  frags: row.frags,
  spotted: row.spotted,
  capturePoints: row.cap,
  droppedCapturePoints: row.def,
  survivedBattles: row.survived
});
