import { describe, expect, it } from 'vitest';

import { bodyWithField, isModContractPath, middlewareStatus, retryAfterSeconds } from '../exception-reply';

describe('bodyWithField', () => {
  it('returns the body when it carries the field', () => {
    const body = { code: 'NOT_FOUND', error: 'missing' };

    expect(bodyWithField({ body, field: 'code' })).toBe(body);
  });

  it('returns null for a body without the field or a non-object body', () => {
    expect(bodyWithField({ body: { error: 'missing' }, field: 'code' })).toBeNull();
    expect(bodyWithField({ body: 'Not Found', field: 'code' })).toBeNull();
    expect(bodyWithField({ body: null, field: 'code' })).toBeNull();
  });
});

describe('middlewareStatus', () => {
  it('reads a client error status from statusCode or status', () => {
    expect(middlewareStatus({ statusCode: 413 })).toBe(413);
    expect(middlewareStatus({ status: 400 })).toBe(400);
  });

  it('ignores server errors, missing statuses and non-objects', () => {
    expect(middlewareStatus({ statusCode: 500 })).toBeNull();
    expect(middlewareStatus({})).toBeNull();
    expect(middlewareStatus('boom')).toBeNull();
  });
});

describe('retryAfterSeconds', () => {
  it('rounds a fractional header up to whole seconds', () => {
    expect(retryAfterSeconds('1.2')).toBe(2);
  });

  it('drops a missing, zero or unreadable header', () => {
    expect(retryAfterSeconds(undefined)).toBeUndefined();
    expect(retryAfterSeconds('0')).toBeUndefined();
    expect(retryAfterSeconds('soon')).toBeUndefined();
  });
});

describe('isModContractPath', () => {
  it.each(['/mod/bind', '/mod/ingest', '/mod/badges', '/mod/badges/presence', '/mod/me/goals', '/mod/settings/apply/poll'])(
    'answers %s in the mod vocabulary',
    (path) => {
      expect(isModContractPath(path)).toBe(true);
    }
  );

  it.each(['/mod/bind-code', '/mod/devices', '/mod/devices/dev_1', '/mod/sync', '/mod/reports', '/players', '/replays/mod'])(
    'answers %s in the API format',
    (path) => {
      expect(isModContractPath(path)).toBe(false);
    }
  );
});
