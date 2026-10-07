import type { GamefaceMock } from '@/shared/api/gameface/mock';

import { createGamefaceMock } from '@/shared/api/gameface/mock';

import type { ViewerState } from '../viewer-protocol';
import type { MockSides, NextMockStateInput } from './viewer-mock.types';

import { parseViewerState } from '../viewer-protocol';
import sample from '../viewer-protocol/_tests/fixtures/viewer-state.sample.json';
import { VIEWER_MOCK } from './viewer-mock.constants';
import { mockMessageSchema } from './viewer-mock.schemas';

export const mockSides = (): MockSides => {
  const received = parseViewerState(JSON.stringify(sample.state));
  const dealt = parseViewerState(JSON.stringify({ ...sample.state, ...sample.dealt, tab: 'dealt', selected: sample.dealt.rows[0]?.index ?? null }));

  if (!received || !dealt) {
    throw new Error(VIEWER_MOCK.invalidFixture);
  }

  return { received, dealt };
};

export const nextMockState = ({ sides, state, raw }: NextMockStateInput): ViewerState | null => {
  const message = mockMessageSchema.safeParse(JSON.parse(raw));

  if (!message.success) {
    return null;
  }

  const { command, index, tab } = message.data;

  if (command === 'select' && index !== undefined) {
    return { ...state, selected: index };
  }

  if (command === 'tab' && tab) {
    return sides[tab];
  }

  return command === 'ready' ? state : null;
};

export const isViewerPage = (pathname: string): boolean => pathname.endsWith(VIEWER_MOCK.page);

export const createViewerDevGameface = (): GamefaceMock => {
  const sides = mockSides();
  let state = sides.received;

  return createGamefaceMock({
    state: JSON.stringify(state),
    clientSize: () => ({ width: window.innerWidth, height: window.innerHeight }),
    onSend: (raw) => {
      const next = nextMockState({ sides, state, raw });

      if (!next) {
        return null;
      }

      state = next;

      return JSON.stringify(state);
    }
  });
};
