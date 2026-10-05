import type { VehicleSummary } from '@otmetki/schemas';

import type { Battle } from '../../../../../generated';
import type { CatalogEntry } from '../../../reference';
import type { RawTankRow } from '../../lib/stat-line/stat-line.types';

export const vehicle = (overrides: Partial<VehicleSummary> & Pick<VehicleSummary, 'tankId'>): VehicleSummary => ({
  name: `Tank ${overrides.tankId}`,
  shortName: `T${overrides.tankId}`,
  slug: `tank-${overrides.tankId}`,
  nation: 'ussr',
  type: 'mediumTank',
  tier: 8,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null },
  ...overrides
});

export const catalogOf = (...summaries: VehicleSummary[]): Map<number, CatalogEntry> =>
  new Map(
    summaries.map((summary) => [
      summary.tankId,
      {
        summary,
        dbType: 'mediumTank',
        specs: null,
        description: null,
        role: null,
        spec: { tags: [], role: null, notInShop: false },
        hasOffers: false
      }
    ])
  );

export const rawRow = (overrides: Partial<RawTankRow> & Pick<RawTankRow, 'battles' | 'tank_id' | 'wins'>): RawTankRow => ({
  damage: overrides.battles * 1_000,
  frags: 0,
  spotted: 0,
  cap: 0,
  def: 0,
  survived: 0,
  ...overrides
});

export const battleRow = (overrides: Partial<Battle> = {}): Battle => ({
  id: 'b1',
  accountId: 7n,
  sessionId: null,
  deviceId: null,
  arenaUniqueId: 1n,
  tankId: 1,
  arenaId: 'himmelsdorf',
  battleType: '1',
  gameMode: null,
  result: 'win',
  team: 1,
  damageDealt: 2_000,
  damageAssistedRadio: 500,
  damageAssistedTrack: 100,
  damageAssistedStun: 0,
  damageBlocked: 300,
  damageReceived: 800,
  spotted: 2,
  frags: 1,
  xp: 900,
  freeXp: null,
  credits: null,
  creditsGross: null,
  isPremiumAccount: null,
  repairCost: null,
  ammoCost: null,
  consumablesCost: null,
  survived: true,
  lifetimeSec: 400,
  capturePoints: 0,
  droppedCapturePoints: 0,
  shotsFired: 8,
  shotsHit: 7,
  shotsPierced: 6,
  shots: null,
  moeMovingAvg: null,
  platoonSize: null,
  platoonMates: [],
  moePercent: null,
  moePercentDelta: null,
  marksOnGun: null,
  queueTimeMs: null,
  durationSec: 420,
  loadout: null,
  achievements: [],
  startedAt: new Date('2026-09-26T09:00:00Z'),
  receivedAt: new Date('2026-09-26T09:08:00Z'),
  ...overrides
});
