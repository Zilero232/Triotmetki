import type { GamefaceMock } from '@/shared/api/gameface/mock';

import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock } from '@/shared/api/gameface/mock';
import { isRecord } from '@/shared/lib/is-record';

import type { ArmorState } from '../armor-protocol';
import type { NextArmorStateInput } from './armor-mock.types';

import { ARMOR_VIEWER } from '../../config';
import { parseArmorState } from '../armor-protocol';
import hover from '../armor-protocol/_tests/fixtures/armor-hover.sample.json';
import map from '../armor-protocol/_tests/fixtures/armor-map.sample.json';
import sample from '../armor-protocol/_tests/fixtures/armor-state.sample.json';
import status from '../armor-protocol/_tests/fixtures/armor-status.sample.json';
import { ARMOR_MOCK } from './armor-mock.constants';
import { mockMessageSchema } from './armor-mock.schemas';

export const mockArmorState = (): ArmorState => {
  const state = parseArmorState(JSON.stringify(sample));

  if (!state) {
    throw new Error(ARMOR_MOCK.invalidFixture);
  }

  return state;
};

export const nextArmorState = ({ state, raw }: NextArmorStateInput): ArmorState | null => {
  const message = mockMessageSchema.safeParse(JSON.parse(raw));

  if (!message.success) {
    return null;
  }

  const { command, mode } = message.data;

  if (command === 'mode' && mode) {
    return { ...state, mode, modes: state.modes.map((entry) => ({ ...entry, active: entry.id === mode })) };
  }

  return command === 'ready' ? state : null;
};

export const isArmorPage = (pathname: string): boolean => pathname.endsWith(ARMOR_MOCK.page);

export const createArmorDevGameface = (): GamefaceMock => {
  let state = mockArmorState();

  const mock = createGamefaceMock({
    state: JSON.stringify(state),
    clientSize: () => ({ width: window.innerWidth, height: window.innerHeight }),
    onSend: (raw) => {
      const next = nextArmorState({ state, raw });

      if (!next) {
        return null;
      }

      state = next;

      return JSON.stringify(state);
    }
  });

  const model = mock.scope[GAMEFACE.globals.model];
  const { properties } = ARMOR_VIEWER;

  if (isRecord(model)) {
    model[properties.map] = JSON.stringify(map);
    model[properties.hover] = JSON.stringify(hover);
    model[properties.status] = JSON.stringify(status);
  }

  return mock;
};
