import { describe, expect, it } from 'vitest';

import { missionOperationRef } from '../operation-ref';

describe('missionOperationRef', () => {
  it('reads positive integer route params', () => {
    expect(missionOperationRef({ campaign: '1', operation: '12' })).toEqual({ campaign: 1, operation: 12 });
  });

  it('rejects anything that is not a positive integer', () => {
    expect(missionOperationRef({ campaign: '1', operation: 'abc' })).toBeNull();
    expect(missionOperationRef({ campaign: '0', operation: '1' })).toBeNull();
    expect(missionOperationRef({ campaign: '01', operation: '1' })).toBeNull();
    expect(missionOperationRef({ campaign: '1.5', operation: '1' })).toBeNull();
  });
});
