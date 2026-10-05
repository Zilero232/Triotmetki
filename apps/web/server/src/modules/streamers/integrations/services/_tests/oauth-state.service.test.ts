import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';

import { OAUTH_STATE } from '../../config/integrations.constants';
import { OAuthStateService } from '../oauth-state.service';

const createService = () => {
  const redis = new RedisMock();

  return { service: new OAuthStateService(redis), redis };
};

describe('OAuthStateService.create', () => {
  it('stores the owner under the state with the configured lifetime', async () => {
    const { service, redis } = createService();

    const { state } = await service.create({ provider: 'twitch', userId: 'u1' });
    const ttl = await redis.ttl(`${OAUTH_STATE.prefix}${state}`);

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(OAUTH_STATE.ttlSeconds);
  });

  it('issues a different url-safe state every time', async () => {
    const { service } = createService();

    const first = await service.create({ provider: 'twitch', userId: 'u1' });
    const second = await service.create({ provider: 'twitch', userId: 'u1' });

    expect(first.state).not.toBe(second.state);
    expect(first.binding).not.toBe(second.binding);
    expect(first.state).toMatch(/^[\w-]+$/u);
  });
});

describe('OAuthStateService.consume', () => {
  it('returns the owner the state was created for', async () => {
    const { service } = createService();

    const issued = await service.create({ provider: 'donationAlerts', userId: 'u1' });

    await expect(service.consume(issued)).resolves.toEqual({ provider: 'donationAlerts', userId: 'u1' });
  });

  it('refuses a state presented without the browser binding it was issued with', async () => {
    const { service } = createService();

    const { state } = await service.create({ provider: 'twitch', userId: 'u1' });

    await expect(service.consume({ state, binding: null })).resolves.toBeNull();
  });

  it('refuses a state presented with the binding of another flow', async () => {
    const { service } = createService();

    const attacker = await service.create({ provider: 'twitch', userId: 'attacker' });
    const victim = await service.create({ provider: 'twitch', userId: 'victim' });

    await expect(service.consume({ state: attacker.state, binding: victim.binding })).resolves.toBeNull();
  });

  it('burns the state even when the binding does not match', async () => {
    const { service } = createService();

    const issued = await service.create({ provider: 'twitch', userId: 'u1' });

    await service.consume({ state: issued.state, binding: 'wrong' });

    await expect(service.consume(issued)).resolves.toBeNull();
  });

  it('refuses to replay a state that was already consumed', async () => {
    const { service } = createService();

    const issued = await service.create({ provider: 'twitch', userId: 'u1' });

    await service.consume(issued);

    await expect(service.consume(issued)).resolves.toBeNull();
  });

  it('returns null for a state that expired or never existed', async () => {
    const { service } = createService();

    await expect(service.consume({ state: 'unknown', binding: 'b' })).resolves.toBeNull();
  });

  it('returns null for a stored value that is not JSON', async () => {
    const { service, redis } = createService();

    await redis.set(`${OAUTH_STATE.prefix}broken`, 'not json');

    await expect(service.consume({ state: 'broken', binding: 'b' })).resolves.toBeNull();
  });

  it('returns null for a stored owner with an unknown provider', async () => {
    const { service, redis } = createService();

    await redis.set(`${OAUTH_STATE.prefix}alien`, JSON.stringify({ provider: 'tiktok', userId: 'u1', binding: 'x' }));

    await expect(service.consume({ state: 'alien', binding: 'b' })).resolves.toBeNull();
  });
});
