import { describe, expect, it } from 'vitest';

import { clipText, predictionThreshold, predictionWinner, readPredictionState } from '../prediction';

const STATE = {
  id: 'p1',
  broadcasterId: 'b1',
  yesId: 'yes',
  noId: 'no',
  threshold: 2400,
  accountId: '42',
  tankId: 1,
  openedAt: '2026-09-26T12:00:00.000Z'
};

describe('prediction helpers', () => {
  it('rounds the recent average damage and falls back without history', () => {
    expect(predictionThreshold(2_437)).toBe(2_400);
    expect(predictionThreshold(120)).toBe(500);
    expect(predictionThreshold(null)).toBe(2_000);
  });

  it('picks the outcome by the battle damage', () => {
    expect(predictionWinner({ state: STATE, damage: 2400 })).toBe('yes');
    expect(predictionWinner({ state: STATE, damage: 2399 })).toBe('no');
  });

  it('clips long titles for Twitch limits', () => {
    expect(clipText({ text: 'abcdef', max: 4 })).toBe('abc…');
    expect(clipText({ text: 'abc', max: 4 })).toBe('abc');
  });

  it('reads only a well-formed stored state', () => {
    expect(readPredictionState(JSON.stringify(STATE))).toEqual(STATE);
    expect(readPredictionState('{"id":1}')).toBeNull();
    expect(readPredictionState('nope')).toBeNull();
    expect(readPredictionState(null)).toBeNull();
  });
});
