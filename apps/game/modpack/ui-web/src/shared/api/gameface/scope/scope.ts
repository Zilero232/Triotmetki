import { isRecord } from '@/shared/lib/is-record';

import type { InvokeInput, ReadGlobalInput, WhenReadyInput } from './scope.types';

import { GAMEFACE } from '../gameface.constants';

export const invoke = ({ target, method, args }: InvokeInput): unknown => {
  const func = target?.[method];

  return typeof func === 'function' ? Reflect.apply(func, target, args) : undefined;
};

export const invokeIfPresent = ({ target, method, args }: InvokeInput): boolean => {
  if (typeof target?.[method] !== 'function') {
    return false;
  }

  invoke({ target, method, args });

  return true;
};

export const whenReady = ({ engine, callback }: WhenReadyInput): void => {
  const ready = engine?.[GAMEFACE.engine.whenReady];

  if (ready instanceof Promise) {
    void ready.then(callback);

    return;
  }

  callback();
};

export const readGlobal = ({ scope, name }: ReadGlobalInput): Record<string, unknown> | null => {
  const value: unknown = Reflect.get(scope, name);

  return isRecord(value) ? value : null;
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

export const scopeModels = (scope: object): unknown[] => {
  const model = readGlobal({ scope, name: GAMEFACE.globals.model });
  const subViews = readGlobal({ scope, name: GAMEFACE.globals.subViews });

  return [model, ...subViewModels(subViews)];
};
