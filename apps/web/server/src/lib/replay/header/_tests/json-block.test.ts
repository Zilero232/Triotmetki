import { describe, expect, it } from 'vitest';

import { ReplayFormatError } from '../../errors/replay-format-error';
import { parseJsonBlock } from '../json-block';

const encode = (text: string) => new TextEncoder().encode(text);

describe('parseJsonBlock', () => {
  it('keeps an arena id wider than 2^53 exact by reading it as a string', () => {
    const id = '90146069577038107';

    expect(parseJsonBlock(encode(`[{"arenaUniqueID": ${id}}]`))).toEqual([{ arenaUniqueID: id }]);
  });

  it('turns the NaN and Infinity that Python json writes into null', () => {
    expect(parseJsonBlock(encode('{"racingFinishTime": Infinity, "x": [NaN, -Infinity], "ok": 1}'))).toEqual({
      racingFinishTime: null,
      x: [null, null],
      ok: 1
    });
  });

  it('throws a format error on text that is not JSON at all', () => {
    expect(() => parseJsonBlock(encode('{not json'))).toThrow(ReplayFormatError);
  });
});
