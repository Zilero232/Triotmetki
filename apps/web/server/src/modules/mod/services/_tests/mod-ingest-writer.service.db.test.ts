import RedisMock from 'ioredis-mock';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ExpectedValuesReaderService } from '../../../reference';
import type { WebhookEmitter } from '../../../webhooks';
import type { BattleResultEvent } from '../../lib/contract/contract.types';
import type { AuthenticatedDevice } from '../../mod.types';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { PurgeGuardService } from '../../../collector/purge';
import { sessionUuid } from '../../lib/battle/battle';
import { ingestBatchSchema } from '../../lib/contract/contract.schemas';
import { EventLedgerService } from '../event-ledger.service';
import { ModIngestWriterService } from '../mod-ingest-writer.service';

const example = ingestBatchSchema.parse(
  JSON.parse(readFileSync(new URL('../../../../../../../game/modpack/contract/examples/ingest.example.json', import.meta.url), 'utf8'))
);

const battle = example.events.find((event): event is BattleResultEvent => event.type === 'battle_result' && event.session_id !== null);

const SEED = {
  userId: 'ingest-user',
  accountId: BigInt(example.account_id)
} as const;

describeWithDatabase('ModIngestWriterService on a real database', () => {
  const prisma = createTestPrisma();

  const createService = () => {
    const expected = mock<ExpectedValuesReaderService>();

    expected.all.mockResolvedValue(new Map());

    return new ModIngestWriterService(
      prisma,
      new EventLedgerService(new RedisMock()),
      expected,
      new PurgeGuardService(prisma),
      mock<WebhookEmitter>()
    );
  };

  const device = async (): Promise<AuthenticatedDevice> => {
    const row = await prisma.modDevice.create({
      data: { id: example.device_id, userId: SEED.userId, accountId: SEED.accountId, secretHash: 'hash' }
    });

    return { ...row, accountId: SEED.accountId };
  };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'play_session', 'player_tank', 'mod_device', 'data_deletion_request', 'player', 'user'] });
    await prisma.user.create({ data: { id: SEED.userId, name: 'Ingest', email: 'ingest@example.test' } });
    await prisma.player.create({ data: { accountId: SEED.accountId, nickname: 'Ingester' } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('opens a live mod session for the first battle and counts the battle into it', async () => {
    if (!battle?.session_id) {
      throw new Error('the ingest example has no session battle');
    }

    const result = await createService().ingest({ device: await device(), batch: { ...example, events: [battle] } });
    const sessionId = sessionUuid({ accountId: SEED.accountId, sessionId: battle.session_id });
    const session = await prisma.playSession.findUniqueOrThrow({ where: { id: sessionId } });

    expect(result).toEqual({ accepted: 1, duplicates: 0, session: { session_id: battle.session_id, wn8: null, battles: 1 } });

    expect(session).toMatchObject({
      accountId: SEED.accountId,
      source: 'mod',
      kind: 'live',
      status: 'open',
      startedAt: new Date(battle.arena_created_at * 1000),
      battles: 1,
      wins: battle.result === 'win' ? 1 : 0,
      damageDealt: battle.stats.damage_dealt,
      credits: battle.stats.factual_credits
    });
  });

  it('stores nothing for an account whose data deletion request is open', async () => {
    if (!battle) {
      throw new Error('the ingest example has no session battle');
    }

    await prisma.dataDeletionRequest.create({ data: { accountId: SEED.accountId, source: 'user', reason: 'account deleted' } });

    await expect(createService().ingest({ device: await device(), batch: { ...example, events: [battle] } })).rejects.toThrow();
    expect(await prisma.battle.count()).toBe(0);
  });

  it('adds a second battle of the same session to the session opened by the first', async () => {
    if (!battle?.session_id) {
      throw new Error('the ingest example has no session battle');
    }

    const second = { ...battle, event_id: 'battle:second', arena_unique_id: '1152921504606847999', arena_created_at: battle.arena_created_at + 600 };
    const service = createService();
    const owner = await device();

    await service.ingest({ device: owner, batch: { ...example, events: [battle] } });
    await service.ingest({ device: owner, batch: { ...example, events: [second] } });

    const session = await prisma.playSession.findUniqueOrThrow({
      where: { id: sessionUuid({ accountId: SEED.accountId, sessionId: battle.session_id }) }
    });

    expect(session.battles).toBe(2);
    expect(session.startedAt).toEqual(new Date(battle.arena_created_at * 1000));
    expect(session.credits).toBe(battle.stats.factual_credits * 2);
  });

  it('counts a battle reported twice as a duplicate and leaves the session totals alone', async () => {
    if (!battle) {
      throw new Error('the ingest example has no session battle');
    }

    const service = createService();
    const owner = await device();

    await service.ingest({ device: owner, batch: { ...example, events: [battle] } });

    const replay = await service.ingest({ device: owner, batch: { ...example, events: [{ ...battle, event_id: 'battle:retry' }] } });

    expect(replay).toMatchObject({ accepted: 0, duplicates: 1 });
    expect(await prisma.battle.count()).toBe(1);
    expect(await prisma.playSession.findFirstOrThrow()).toMatchObject({ battles: 1 });
  });

  it('accepts both copies of a battle sent by two racing batches only once', async () => {
    if (!battle) {
      throw new Error('the ingest example has no session battle');
    }

    const owner = await device();
    const results = await Promise.all([
      createService().ingest({ device: owner, batch: { ...example, events: [battle] } }),
      createService().ingest({ device: owner, batch: { ...example, events: [{ ...battle, event_id: 'battle:race' }] } })
    ]);

    expect(results.map((result) => result.accepted).sort()).toEqual([0, 1]);
    expect(await prisma.battle.count()).toBe(1);
    expect(await prisma.playSession.findFirstOrThrow()).toMatchObject({ battles: 1 });
  });
});
