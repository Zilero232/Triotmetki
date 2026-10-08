import { describe, expect, it } from 'vitest';

import { isMoscowZone } from '../time-zone';

describe('isMoscowZone', () => {
  it('recognises the Moscow zone the server sends', () => {
    expect(isMoscowZone('Europe/Moscow')).toBe(true);
  });

  it('treats another zone as foreign', () => {
    expect(isMoscowZone('Asia/Yekaterinburg')).toBe(false);
  });
});
