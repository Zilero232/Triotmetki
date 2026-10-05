import { describe, expect, it } from 'vitest';

import { LESTA } from '../../lesta.constants';
import { isProduction, validateEnv } from '../env';

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5434/db',
  REDIS_URL: 'redis://localhost:6380',
  API_URL: 'http://localhost:4000',
  WEB_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  INTERNAL_API_TOKEN: 'i'.repeat(32),
  MOD_INGEST_SECRET: 'm'.repeat(32),
  TOKEN_ENCRYPTION_SECRET: 't'.repeat(32)
};

describe('validateEnv', () => {
  it('throws when a required variable is missing', () => {
    expect(() => validateEnv({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('starts without a Lesta application id in every environment so the worker can run degraded', () => {
    expect(validateEnv({ ...base, NODE_ENV: 'development' }).LESTA_APPLICATION_ID).toBe('');
    expect(validateEnv({ ...base, NODE_ENV: 'test' }).LESTA_APPLICATION_ID).toBe('');
  });

  it('passes a real Lesta application id through unchanged', () => {
    expect(validateEnv({ ...base, LESTA_APPLICATION_ID: 'real-key' }).LESTA_APPLICATION_ID).toBe('real-key');
  });

  it('splits the registered Lesta egress IPs and caps them at the Lesta limit', () => {
    const ips = Array.from({ length: LESTA.egress.maxIps }, (_, index) => `10.0.0.${index + 1}`);

    expect(validateEnv({ ...base, LESTA_EGRESS_IPS: ips.join(', ') }).LESTA_EGRESS_IPS).toEqual(ips);
    expect(() => validateEnv({ ...base, LESTA_EGRESS_IPS: [...ips, '10.0.0.99'].join(',') })).toThrow(/LESTA_EGRESS_IPS/);
    expect(validateEnv(base).LESTA_EGRESS_IPS).toEqual([]);
  });

  it('refuses an egress IP that is not one of the registered ones', () => {
    expect(() => validateEnv({ ...base, LESTA_EGRESS_IPS: '10.0.0.1', LESTA_EGRESS_IP: '10.0.0.2' })).toThrow(/LESTA_EGRESS_IP/);
    expect(validateEnv({ ...base, LESTA_EGRESS_IPS: '10.0.0.1', LESTA_EGRESS_IP: '10.0.0.1' }).LESTA_EGRESS_IP).toBe('10.0.0.1');
  });

  it('coerces numeric variables', () => {
    expect(validateEnv({ ...base, LESTA_RPS: '7' }).LESTA_RPS).toBe(7);
  });

  it('rejects an auth secret too short to be safe', () => {
    expect(() => validateEnv({ ...base, BETTER_AUTH_SECRET: 'short' })).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('rejects a mod ingest secret too short to key device secrets', () => {
    expect(() => validateEnv({ ...base, MOD_INGEST_SECRET: 'm'.repeat(31) })).toThrow(/MOD_INGEST_SECRET/);
  });

  it('requires a token encryption secret long enough to be safe, with no fallback', () => {
    expect(() => validateEnv({ ...base, TOKEN_ENCRYPTION_SECRET: undefined })).toThrow(/TOKEN_ENCRYPTION_SECRET/);
    expect(() => validateEnv({ ...base, TOKEN_ENCRYPTION_SECRET: 'short' })).toThrow(/TOKEN_ENCRYPTION_SECRET/);
  });

  it('requires an internal API token long enough to be safe, with no fallback', () => {
    expect(() => validateEnv({ ...base, INTERNAL_API_TOKEN: undefined })).toThrow(/INTERNAL_API_TOKEN/);
    expect(() => validateEnv({ ...base, INTERNAL_API_TOKEN: 'short' })).toThrow(/INTERNAL_API_TOKEN/);
  });
});

describe('validateEnv fail-closed guards', () => {
  const deployed = { ...base, API_URL: 'https://api.triotmetki.ru', WEB_URL: 'https://triotmetki.ru' };

  it('refuses a deployed API that does not say which environment it runs in', () => {
    expect(() => validateEnv(deployed)).toThrow(/NODE_ENV/);
  });

  it('defaults to development only on a local host', () => {
    expect(validateEnv(base).NODE_ENV).toBe('development');
  });

  it.each(['BETTER_AUTH_SECRET', 'MOD_INGEST_SECRET', 'INTERNAL_API_TOKEN', 'TOKEN_ENCRYPTION_SECRET'])(
    'refuses a development placeholder %s in production',
    (name) => {
      expect(() => validateEnv({ ...deployed, NODE_ENV: 'production', [name]: 'dev-secret-change-me-min-32-chars-000' })).toThrow(name);
    }
  );

  it('accepts real secrets in production', () => {
    expect(validateEnv({ ...deployed, NODE_ENV: 'production' }).NODE_ENV).toBe('production');
  });
});

describe('validateEnv in production without a Lesta key', () => {
  const deployed = { ...base, API_URL: 'https://api.triotmetki.ru', WEB_URL: 'https://triotmetki.ru', NODE_ENV: 'production' };

  it('boots with an empty key and ignores the retired LESTA_MOCK and DEMO_MODE', () => {
    const env = validateEnv({ ...deployed, LESTA_MOCK: 'on', DEMO_MODE: 'true' });

    expect(env.LESTA_APPLICATION_ID).toBe('');
    expect(env).not.toHaveProperty('LESTA_MOCK');
    expect(env).not.toHaveProperty('DEMO_MODE');
  });
});

describe('isProduction', () => {
  it('is true only for NODE_ENV=production', () => {
    expect(isProduction({ NODE_ENV: 'production' })).toBe(true);
    expect(isProduction({ NODE_ENV: 'development' })).toBe(false);
    expect(isProduction({ NODE_ENV: 'test' })).toBe(false);
  });
});
