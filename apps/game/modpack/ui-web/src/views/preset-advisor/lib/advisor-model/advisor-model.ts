import { scopeModels } from '@/shared/api/gameface/scope';
import { isRecord } from '@/shared/lib/is-record';

import { PRESET_ADVISOR } from '../../config';

export const toItems = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value) || typeof value.length !== 'number') {
    return [];
  }

  return Array.from({ length: value.length }, (_, index) => {
    const item = value[index];

    return isRecord(item) && 'value' in item ? item.value : item;
  });
};

export const findAdvisorModels = (scope: object): Record<string, unknown>[] =>
  scopeModels(scope).filter((model): model is Record<string, unknown> => isRecord(model) && isRecord(model[PRESET_ADVISOR.model.property]));

export const payloadOf = (model: Record<string, unknown>): unknown => {
  const advisor = model[PRESET_ADVISOR.model.property];

  return isRecord(advisor) ? advisor[PRESET_ADVISOR.model.payload] : undefined;
};
