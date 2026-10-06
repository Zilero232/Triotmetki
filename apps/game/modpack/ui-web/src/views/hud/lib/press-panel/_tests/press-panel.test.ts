import { describe, expect, it } from 'vitest';

import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';

import { pressPanel } from '../press-panel';

describe(pressPanel, () => {
  it('reports the press of a panel to the game', () => {
    const mock = createGamefaceMock({ state: '', clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });

    installGamefaceMock(mock);
    pressPanel('otmetki.hud.settings');

    expect(mock.sent().map((message) => JSON.parse(message))).toEqual([{ type: 'pressed', id: 'otmetki.hud.settings' }]);
  });
});
