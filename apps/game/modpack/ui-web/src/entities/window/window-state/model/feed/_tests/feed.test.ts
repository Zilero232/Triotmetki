import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';

import { $feed, receiveFeed, unwatchFeed, watchFeed } from '../feed';

const COMPONENT = 'replay_manager';

const message = (values: Record<string, unknown>): string =>
  JSON.stringify({ v: 2, feed: COMPONENT, rev: 1, base: null, page: { kind: 'replays' }, items: [{ id: 'a' }], ...values });

const snapshot = message({});
const gapDelta = message({ rev: 5, base: 4, set: [] });

let sent: () => unknown[];

beforeEach(() => {
  const mock = createGamefaceMock({ state: '', clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });

  installGamefaceMock(mock);
  sent = () => mock.sent().map((raw) => JSON.parse(raw));
});

afterEach(() => {
  unwatchFeed(COMPONENT);
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
});

const watchWithSnapshot = (): void => {
  watchFeed(COMPONENT);
  receiveFeed(snapshot);
};

const loseTrack = (): void => {
  watchWithSnapshot();
  receiveFeed(gapDelta);
};

describe(watchFeed, () => {
  it('asks the mod for the feed of the page it shows', () => {
    watchFeed(COMPONENT);

    expect(sent()).toEqual([{ type: 'feed', component: COMPONENT, active: true }]);
  });
});

describe(receiveFeed, () => {
  it('takes the snapshot of the watched feed', () => {
    watchFeed(COMPONENT);

    const taken = receiveFeed(snapshot);

    expect(taken).toBe(true);
    expect($feed.get()?.items).toEqual([{ id: 'a' }]);
  });

  it('applies a delta on top of the snapshot', () => {
    watchWithSnapshot();

    const taken = receiveFeed(message({ rev: 2, base: 1, items: undefined, set: [{ id: 'b' }], del: ['a'] }));

    expect(taken).toBe(true);
    expect($feed.get()?.items).toEqual([{ id: 'b' }]);
  });

  it('refuses a delta it cannot place and asks for a new snapshot', () => {
    watchWithSnapshot();

    const taken = receiveFeed(gapDelta);

    expect(taken).toBe(false);
    expect(sent()).toHaveLength(2);
  });

  it('asks only once while it waits for the new snapshot', () => {
    loseTrack();

    const taken = receiveFeed(message({ rev: 6, base: 5, set: [] }));

    expect(taken).toBe(false);
    expect(sent()).toHaveLength(2);
  });

  it('takes the new snapshot once it arrives', () => {
    loseTrack();

    const taken = receiveFeed(message({ rev: 7, items: [{ id: 'c' }] }));

    expect(taken).toBe(true);
    expect($feed.get()?.items).toEqual([{ id: 'c' }]);
  });

  it('asks again when it loses track after the new snapshot', () => {
    loseTrack();
    receiveFeed(message({ rev: 7, items: [{ id: 'c' }] }));

    const taken = receiveFeed(message({ rev: 9, base: 8, set: [] }));

    expect(taken).toBe(false);
    expect(sent()).toHaveLength(3);
  });

  it('ignores a feed before any page watches it', () => {
    expect(receiveFeed(snapshot)).toBe(false);
  });

  it('ignores the feed of another component', () => {
    watchFeed(COMPONENT);

    const taken = receiveFeed(message({ feed: 'other' }));

    expect(taken).toBe(false);
  });

  it('ignores a message that does not parse', () => {
    watchFeed(COMPONENT);

    const taken = receiveFeed('{');

    expect(taken).toBe(false);
  });
});

describe(unwatchFeed, () => {
  it('drops the data when the page goes', () => {
    watchWithSnapshot();

    unwatchFeed(COMPONENT);

    expect($feed.get()).toBeNull();
  });

  it('tells the mod the page no longer needs the feed', () => {
    watchWithSnapshot();

    unwatchFeed(COMPONENT);

    expect(sent().at(-1)).toEqual({ type: 'feed', component: COMPONENT, active: false });
  });

  it('ignores the feed once the page has gone', () => {
    watchWithSnapshot();
    unwatchFeed(COMPONENT);

    const taken = receiveFeed(message({ rev: 3 }));

    expect(taken).toBe(false);
  });
});
