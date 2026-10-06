import { describe, expect, it } from 'vitest';

import { REPLAY_CONTAINER } from '../../container/container.constants';
import { ReplayFormatError } from '../../errors/replay-format-error';
import { parseJsonBlock } from '../json-block';

const encode = (text: string) => new TextEncoder().encode(text);
const whitespace = ' '.repeat(REPLAY_CONTAINER.maxHeaderBytes);
const timeBudgetMs = 1_000;

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

  it('leaves NaN and Infinity inside a string untouched', () => {
    expect(parseJsonBlock(encode('{"note": ": NaN, Infinity]", "x": NaN}'))).toEqual({ note: ': NaN, Infinity]', x: null });
  });

  it('reads a header-sized run of whitespace before a NaN within the time budget', () => {
    const startedAt = performance.now();

    expect(parseJsonBlock(encode(`{"a": [${whitespace}NaN]}`))).toEqual({ a: [null] });
    expect(performance.now() - startedAt).toBeLessThan(timeBudgetMs);
  });

  it('refuses a header-sized run of whitespace that is not JSON within the time budget', () => {
    const startedAt = performance.now();

    expect(() => parseJsonBlock(encode(`{"a":${whitespace}x}`))).toThrow(ReplayFormatError);
    expect(performance.now() - startedAt).toBeLessThan(timeBudgetMs);
  });

  it('throws a format error on text that is not JSON at all', () => {
    expect(() => parseJsonBlock(encode('{not json'))).toThrow(ReplayFormatError);
  });
});
