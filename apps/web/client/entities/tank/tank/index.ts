export {
  compareTanks,
  getMyEconomy,
  getMyTankLearning,
  getTank,
  getTankEconomy,
  getTankPatches,
  getTankTopPlayers,
  getTankTrend,
  getTierList,
  listTankEconomy,
  listTankStats,
  vehicleCatalogQuery
} from './api';
export type { TankDetailInput, TankEconomyTableInput, TankStatsInput, TierListInput } from './api';
export { economyView } from './api';
export type { EconomyView } from './api';
export { ECONOMY_VIEW, TANK_COLLECTION_SLUGS, TANK_DETAIL, TANK_SPEC_GROUPS, TANK_SPEC_KEYS, TANK_SPECS } from './config';
export { pickVehicles, vehicleIndex } from './lib/pick-vehicles';
export { isLowerBetter, specBest, specDelta } from './lib/spec-rank';
export type { SpecVerdict } from './lib/spec-rank';
export { collectionVehicles, isTankCollection } from './lib/tank-collections';
export type { TankCollectionSlug } from './lib/tank-collections';
export { vehicleIdentity } from './lib/vehicle-identity';
export { specKeyOfPath, specPath, specsOfFlat, specsOfStats } from './lib/vehicle-specs';
export { useSpecFormat } from './model/hooks';
export type { TankSpecGroup, TankSpecKey } from './model/tank-specs.types';
export type { TankIdentityData, TankSpecs } from './model/tank.types';
export { CatalogPending } from './ui/CatalogPending';
export { LearningBadge } from './ui/LearningBadge';
export { SweatBadge } from './ui/SweatBadge';
export { TankCard } from './ui/TankCard';
export { TankCell } from './ui/TankCell';
export { TankIdentity } from './ui/TankIdentity';
export { TankLink } from './ui/TankLink';
export { TankRoleBadge } from './ui/TankRoleBadge';
export { TankShowcaseCard } from './ui/TankShowcaseCard';
export { TankSlot } from './ui/TankSlot';
export { TankStatusBadge } from './ui/TankStatusBadge';
export { TankStrip } from './ui/TankStrip';
export { TierCell } from './ui/TierCell';
export { WinRateCell } from './ui/WinRateCell';
export { TankImage } from '@/ui-kit';
export type { TankImageSize } from '@/ui-kit';
