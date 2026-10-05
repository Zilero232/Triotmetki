import { isRecord } from '@/shared/lib/is-record';

import type { InvokeInput, WhenReadyInput } from './scope.types';

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

export const readGlobal = (scope: object, name: string): Record<string, unknown> | null => {
  const value: unknown = Reflect.get(scope, name);

  return isRecord(value) ? value : null;
};
