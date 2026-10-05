import { isRecord } from '@/shared/lib/is-record';

import { PRESET_ADVISOR } from '../../config';

const call = (target: unknown, method: string, args: unknown[] = []): unknown => {
  const func = isRecord(target) ? target[method] : undefined;

  return typeof func === 'function' ? Reflect.apply(func, target, args) : undefined;
};

const subViewModels = (scope: object): unknown[] => {
  const subViews: unknown = Reflect.get(scope, 'subViews');
  const ids = call(subViews, 'ids');

  if (!Array.isArray(ids)) {
    return [];
  }

  return ids.map((id: unknown) => {
    const view = call(subViews, 'get', [id]);

    return isRecord(view) ? view.model : undefined;
  });
};

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
  [Reflect.get(scope, 'model'), ...subViewModels(scope)].filter(
    (model): model is Record<string, unknown> => isRecord(model) && isRecord(model[PRESET_ADVISOR.model.property])
  );

export const payloadOf = (model: Record<string, unknown>): unknown => {
  const advisor = model[PRESET_ADVISOR.model.property];

  return isRecord(advisor) ? advisor[PRESET_ADVISOR.model.payload] : undefined;
};
