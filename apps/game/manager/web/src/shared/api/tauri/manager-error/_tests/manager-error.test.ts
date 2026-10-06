import errorFixture from '@contract/error.json';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ManagerError, toManagerError } from '../manager-error';
import { MANAGER_ERROR_CODES } from '../manager-error.constants';

describe('toManagerError', () => {
  it('turns the error the Rust commands serialise into a ManagerError', () => {
    expect(toManagerError(errorFixture)).toBeInstanceOf(ManagerError);
  });

  it('keeps the code and the message of the serialised error', () => {
    expect(toManagerError(errorFixture)).toMatchObject({ code: errorFixture.code, message: errorFixture.message });
  });

  it('keeps an unknown code readable instead of failing', () => {
    expect(toManagerError({ code: 'brand_new', message: 'x' }).code).toBe('unknown');
  });

  it('marks a response that broke the contract', () => {
    expect(toManagerError(new z.ZodError([])).code).toBe('contract');
  });

  it('wraps anything else as unknown', () => {
    expect(toManagerError('boom')).toMatchObject({ code: 'unknown', message: 'boom' });
  });

  it('knows every code it can be handed', () => {
    expect(MANAGER_ERROR_CODES).toContain(errorFixture.code);
  });
});
