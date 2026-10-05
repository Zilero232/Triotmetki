import { describe, expect, it } from 'vitest';

import { LESTA_ERROR_CODE } from '../../errors/errors.constants';
import { classifyLestaResponse } from '../outcome';

describe('classifyLestaResponse', () => {
  it('treats a normal envelope as ok', () => {
    expect(classifyLestaResponse({ status: 200, errorCode: null })).toBe('ok');
  });

  it('flags the rate limit and source outages as degraded', () => {
    expect(classifyLestaResponse({ status: 200, errorCode: LESTA_ERROR_CODE.requestLimitExceeded })).toBe('degraded');
    expect(classifyLestaResponse({ status: 200, errorCode: LESTA_ERROR_CODE.sourceNotAvailable })).toBe('degraded');
    expect(classifyLestaResponse({ status: 503, errorCode: null })).toBe('degraded');
  });

  it('keeps our own mistakes out of the degradation signal', () => {
    expect(classifyLestaResponse({ status: 200, errorCode: LESTA_ERROR_CODE.accountIdListLimitExceeded })).toBe('rejected');
    expect(classifyLestaResponse({ status: 404, errorCode: null })).toBe('rejected');
  });
});
