import { describe, expect, it } from 'vitest';

import { VEHICLE_TYPE_FROM_DB } from '../../../../common/lib';
import { WEEKLY_CHALLENGES } from '../../config/challenges.constants';
import { badgeCodeOf } from '../../lib/challenges/challenges';
import { toFeedBadge } from '../feed-badge.mappers';

describe('toFeedBadge', () => {
  it('describes every weekly badge by the challenge that awards it', () => {
    for (const definition of WEEKLY_CHALLENGES) {
      expect(toFeedBadge(badgeCodeOf(definition))).toMatchObject({
        code: badgeCodeOf(definition),
        challenge: { code: definition.code, metric: definition.metric, target: definition.target }
      });
    }
  });

  it('carries the public vehicle type of a class-bound challenge', () => {
    for (const definition of WEEKLY_CHALLENGES) {
      if ('vehicleType' in definition) {
        expect(toFeedBadge(badgeCodeOf(definition)).challenge?.vehicleType).toBe(VEHICLE_TYPE_FROM_DB[definition.vehicleType]);
      }
    }
  });

  it('keeps an unknown badge without a challenge', () => {
    expect(toFeedBadge('founder')).toEqual({ code: 'founder', challenge: null });
  });
});
