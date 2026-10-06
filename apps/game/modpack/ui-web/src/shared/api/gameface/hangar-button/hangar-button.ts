import { isRecord } from '@/shared/lib/is-record';

import type { HangarButton } from './hangar-button.types';

import { GAMEFACE } from '../gameface.constants';
import { invoke, scopeModels } from '../scope';

const isButtonModel = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && value[GAMEFACE.button.marker] === GAMEFACE.button.markerValue && typeof value[GAMEFACE.button.open] === 'function';

const unwrapModel = (candidate: unknown): unknown => {
  const nested = isRecord(candidate) ? candidate[GAMEFACE.model.nested] : null;

  return isRecord(nested) ? nested : candidate;
};

const findButtonModel = (scope: object): Record<string, unknown> | null => scopeModels(scope).map(unwrapModel).find(isButtonModel) ?? null;

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
