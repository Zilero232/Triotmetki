import { describe, expect, it } from 'vitest';

import { parseAdvicePayload } from '../advice-payload';

describe('parseAdvicePayload', () => {
  it('reads the tank, the items and the badge label', () => {
    expect(parseAdvicePayload('{"items":[1,2],"label":"Site build","tankId":7,"v":1}')).toEqual({ tankId: 7, items: [1, 2], label: 'Site build' });
  });

  it.each([undefined, '', 'not json', '{"v":2,"tankId":7,"items":[],"label":""}', '{"v":1,"tankId":7,"items":"x","label":""}'])(
    'ignores %s',
    (text) => {
      expect(parseAdvicePayload(text)).toBeNull();
    }
  );
});
