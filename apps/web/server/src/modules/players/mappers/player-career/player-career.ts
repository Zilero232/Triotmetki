import type { PlayerAssist } from '@otmetki/schemas';

import type { CareerSource } from '../../../collector';
import type { CareerRecordRef } from './player-career.types';

export const toPlayerAssist = (source: CareerSource): PlayerAssist | null => {
  const assist = {
    avgAssisted: source.avgDamageAssisted,
    avgRadio: source.avgDamageAssistedRadio,
    avgTrack: source.avgDamageAssistedTrack,
    avgStun: source.avgDamageAssistedStun
  };

  return Object.values(assist).every((value) => value === null) ? null : assist;
};

export const careerRecordRefs = (source: CareerSource): CareerRecordRef[] =>
  [
    { key: 'maxDamage' as const, value: source.maxDamage, tankId: source.maxDamageTankId },
    { key: 'maxXp' as const, value: source.maxXp, tankId: source.maxXpTankId },
    { key: 'maxFrags' as const, value: source.maxFrags, tankId: source.maxFragsTankId }
  ].flatMap(({ key, value, tankId }) => (value !== null && value > 0 ? [{ key, value, tankId }] : []));
