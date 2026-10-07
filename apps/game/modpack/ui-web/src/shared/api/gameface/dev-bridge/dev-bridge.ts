import type { UiState } from '@/shared/api/protocol';

import { messageSchema, parseState, PROTOCOL } from '@/shared/api/protocol';
import sample from '@/shared/api/protocol/_tests/fixtures/state.sample.json';

import type { GamefaceMock } from '../mock';
import type { DevGamefaceInput, ReplaysSnapshotInput } from './dev-bridge.types';

import { createGamefaceMock } from '../mock';
import { applyMessage } from './apply-message';
import { DEV_MOCK } from './dev-bridge.constants';

const QUIET_MESSAGES = new Set<string>(DEV_MOCK.quietMessages);

const sampleState = (): UiState => {
  const state = parseState(JSON.stringify(sample));

  if (!state) {
    throw new Error(DEV_MOCK.invalidFixture);
  }

  return {
    ...state,
    components: state.components.map((component) =>
      component.id === DEV_MOCK.replaysComponent ? { ...component, page: { kind: DEV_MOCK.replaysPageKind } } : component
    )
  };
};

const replaysSnapshot = ({ replaysPage, rev }: ReplaysSnapshotInput): string => {
  const { items, ...page } = replaysPage;

  return JSON.stringify({ v: PROTOCOL.version, feed: DEV_MOCK.replaysComponent, rev, base: null, page, items });
};

export const createDevGameface = ({ replaysPage }: DevGamefaceInput): GamefaceMock => {
  let state = sampleState();
  let feedRev = 0;

  return createGamefaceMock({
    state: JSON.stringify(state),
    clientSize: () => ({ width: window.innerWidth, height: window.innerHeight }),
    onSend: (raw) => {
      const parsed = messageSchema.safeParse(JSON.parse(raw));

      console.warn(DEV_MOCK.logPrefix, raw);

      if (!parsed.success || QUIET_MESSAGES.has(parsed.data.type)) {
        return null;
      }

      if (parsed.data.type === 'feed') {
        feedRev += 1;

        return parsed.data.active ? { feed: replaysSnapshot({ replaysPage, rev: feedRev }) } : null;
      }

      state = applyMessage({ state, message: parsed.data });

      return JSON.stringify(state);
    }
  });
};

export const relayEscape = (mock: GamefaceMock): void => {
  let asked = 0;

  document.addEventListener('keydown', (event) => {
    if (event.key === DEV_MOCK.escapeKey) {
      asked += 1;
      mock.push({ escape: asked });
    }
  });
};

export const applyDesignRem = (): void => {
  document.documentElement.style.fontSize = DEV_MOCK.rootFontSize;
};
