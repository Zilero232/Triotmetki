import type { AccountSnapshot } from '../../../../../../generated';

export type CareerSource = Pick<
  AccountSnapshot,
  | 'avgDamageAssisted'
  | 'avgDamageAssistedRadio'
  | 'avgDamageAssistedStun'
  | 'avgDamageAssistedTrack'
  | 'maxDamage'
  | 'maxDamageTankId'
  | 'maxFrags'
  | 'maxFragsTankId'
  | 'maxXp'
  | 'maxXpTankId'
>;
