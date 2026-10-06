import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGamefaceBridge } from '../gameface';
import { GAMEFACE } from '../gameface.constants';
import { createGamefaceMock } from '../mock';

type DataChangedListener = (data: unknown, indexes: unknown, ids: unknown) => void;

const SIZE = { width: 2560, height: 1440 };
const REGISTERED_CALLBACK_ID = 4;

const mockBridge = (onSend: (message: string) => string | null = () => null) => {
  const mock = createGamefaceMock({ state: 'initial', clientSize: () => SIZE, onSend });

  return { mock, bridge: createGamefaceBridge(mock.scope) };
};

const emptyBridge = () => createGamefaceBridge({});

const silenceWarnings = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

const engineBridge = () => {
  const listeners: DataChangedListener[] = [];
  const register = vi.fn(() => REGISTERED_CALLBACK_ID);
  const bridge = createGamefaceBridge({
    engine: { whenReady: Promise.resolve(), on: (_event: string, listener: DataChangedListener) => listeners.push(listener) },
    viewEnv: { addDataChangedCallback: register }
  });

  const changeData = (callbackId: number) => listeners[0]?.({}, [], [callbackId]);

  return { bridge, register, changeData };
};

const listenTo = async (bridge: ReturnType<typeof createGamefaceBridge>) => {
  const seen = vi.fn();

  bridge.onDataChanged(seen);
  await Promise.resolve();

  return seen;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe(createGamefaceBridge, () => {
  describe('state', () => {
    it('reads the state from the Gameface model', () => {
      const { bridge } = mockBridge();

      expect(bridge.state()).toBe('initial');
    });

    it('reads null without a model', () => {
      expect(emptyBridge().state()).toBeNull();
    });
  });

  describe('clientSize', () => {
    it('reads the client size from the view environment', () => {
      const { bridge } = mockBridge();

      expect(bridge.clientSize()).toEqual(SIZE);
    });

    it('reads null without a view environment', () => {
      expect(emptyBridge().clientSize()).toBeNull();
    });
  });

  describe('feed', () => {
    const feedBridge = async () => {
      const mock = createGamefaceMock({ state: 'initial', feed: 'first', clientSize: () => SIZE, onSend: () => ({ feed: 'second' }) });
      const bridge = createGamefaceBridge(mock.scope);
      const feeds: (string | null)[] = [];

      bridge.onDataChanged(() => feeds.push(bridge.feed()));
      await Promise.resolve();

      return { bridge, feeds };
    };

    it('hears the first feed and then the one the mock pushes', async () => {
      const { bridge, feeds } = await feedBridge();

      bridge.send('watch');

      expect(feeds).toEqual(['first', 'second']);
    });

    it('leaves the state alone when only the feed changes', async () => {
      const { bridge } = await feedBridge();

      bridge.send('watch');

      expect(bridge.state()).toBe('initial');
    });
  });

  describe('send', () => {
    it('reports the message as sent', () => {
      const { bridge } = mockBridge();

      const delivered = bridge.send('ping');

      expect(delivered).toBe(true);
    });

    it('passes the message to the model command', () => {
      const { mock, bridge } = mockBridge();

      bridge.send('ping');

      expect(mock.sent()).toEqual(['ping']);
    });

    it('hears the state the model answers with', async () => {
      const { bridge } = mockBridge((message) => `after ${message}`);
      const states: (string | null)[] = [];

      bridge.onDataChanged(() => states.push(bridge.state()));
      await Promise.resolve();

      bridge.send('ping');

      expect(states).toEqual(['initial', 'after ping']);
    });

    it('reports a missing model instead of throwing', () => {
      silenceWarnings();

      const delivered = emptyBridge().send('ping');

      expect(delivered).toBe(false);
    });

    it('warns once about a missing model', () => {
      const warn = silenceWarnings();

      emptyBridge().send('ping');

      expect(warn).toHaveBeenCalledOnce();
    });
  });

  describe('resizeView', () => {
    it('sizes the view to the client', () => {
      const resize = vi.fn();
      const bridge = createGamefaceBridge({ viewEnv: { [GAMEFACE.viewEnv.resizeView]: resize } });

      const resized = bridge.resizeView(SIZE);

      expect(resized).toBe(true);
      expect(resize).toHaveBeenCalledWith(2560, 1440);
    });

    it('refuses when the view cannot be resized', () => {
      expect(emptyBridge().resizeView(SIZE)).toBe(false);
    });
  });

  describe('onDataChanged', () => {
    it('registers for changes of the model root', async () => {
      const { bridge, register } = engineBridge();

      await listenTo(bridge);

      expect(register).toHaveBeenCalledWith('model', 0, true);
    });

    it('calls back once as soon as it is registered', async () => {
      const { bridge } = engineBridge();

      const seen = await listenTo(bridge);

      expect(seen).toHaveBeenCalledOnce();
    });

    it('ignores the data changes of another callback', async () => {
      const { bridge, changeData } = engineBridge();
      const seen = await listenTo(bridge);

      changeData(9);

      expect(seen).toHaveBeenCalledOnce();
    });

    it('hears the data changes of the callback it registered', async () => {
      const { bridge, changeData } = engineBridge();
      const seen = await listenTo(bridge);

      changeData(REGISTERED_CALLBACK_ID);

      expect(seen).toHaveBeenCalledTimes(2);
    });
  });

  describe('setInputArea', () => {
    it('limits the input area of the view', () => {
      const { mock, bridge } = mockBridge();

      const limited = bridge.setInputArea({ left: 1, top: 2, width: 3, height: 4 });

      expect(limited).toBe(true);
      expect(mock.inputAreas()).toEqual([[1, 2, 3, 4]]);
    });

    it('refuses when the view has no input area', () => {
      expect(emptyBridge().setInputArea({ left: 0, top: 0, width: 0, height: 0 })).toBe(false);
    });
  });
});
