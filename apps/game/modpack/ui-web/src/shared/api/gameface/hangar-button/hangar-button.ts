import { isRecord } from '@/shared/lib/is-record';

import type { HangarButton } from './hangar-button.types';

import { GAMEFACE } from '../gameface.constants';
import { invoke, readGlobal } from '../scope';

const isButtonModel = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && value[GAMEFACE.button.marker] === GAMEFACE.button.markerValue && typeof value[GAMEFACE.button.open] === 'function';

const unwrapModel = (candidate: unknown): unknown => {
  const nested = isRecord(candidate) ? candidate[GAMEFACE.model.nested] : null;

  return isRecord(nested) ? nested : candidate;
};

const subViewModels = (subViews: Record<string, unknown> | null): unknown[] => {
  const ids = invoke({ target: subViews, method: GAMEFACE.subViews.ids, args: [] });

  if (!Array.isArray(ids)) {
    return [];
  }

  return ids.map((id: unknown) => {
    const view = invoke({ target: subViews, method: GAMEFACE.subViews.get, args: [id] });

    return isRecord(view) ? view[GAMEFACE.model.nested] : null;
  });
};

const findButtonModel = (scope: object): Record<string, unknown> | null => {
  const candidates = [readGlobal(scope, GAMEFACE.globals.model), ...subViewModels(readGlobal(scope, GAMEFACE.globals.subViews))];

  return candidates.map(unwrapModel).find(isButtonModel) ?? null;
};

export const createHangarButton = (scope: object): HangarButton => ({
  openWindow: () => {
    const model = findButtonModel(scope);

    if (!model) {
      console.warn(GAMEFACE.log.noButtonModel);

      return false;
    }

    invoke({ target: model, method: GAMEFACE.button.open, args: [{}] });

    return true;
  }
});
