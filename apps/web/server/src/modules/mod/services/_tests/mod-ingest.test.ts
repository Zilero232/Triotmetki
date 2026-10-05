import RedisMock from 'ioredis-mock';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { matches, mock, mockDeep } from 'vitest-mock-extended';

import type { Battle, PlayerTank } from '../../../../../generated';
import type { BattleEventsSink, PrismaService, WebhookEmitter } from '../../../../core';
import type { ExpectedValuesService } from '../../../reference';
import type { IngestEvent } from '../../lib';
import type { AuthenticatedDevice } from '../../mod.types';

import { EventLedgerService, ModIngestService } from '..';
import { Prisma } from '../../../../../generated';
import { MOD_INGEST } from '../../config';
import { ingestBatchSchema, moePercent } from '../../lib';

const example = ingestBatchSchema.parse(
  JSON.parse(readFileSync(new URL('../../../../../../../game/modpack/contract/examples/ingest.example.json', import.meta.url), 'utf8'))
);

const battleEvents = example.events.filter((event) => event.type === 'battle_result');

const moeBattle = () => {
  const found = example.events.find((event) => event.type === 'battle_result' && event.moe);

  if (found?.type !== 'battle_result' || !found.moe) {
    throw new Error('the ingest example has no battle with MoE progress');
  }

  return { event: found, moe: found.moe };
};

const moeSnapshot = () => {
  const found = example.events.find((event) => event.type === 'moe_snapshot');

  if (found?.type !== 'moe_snapshot') {
    throw new Error('the ingest example has no MoE snapshot');
  }

  return found;
};

const device: AuthenticatedDevice = {
  id: example.device_id,
  userId: 'user',
  accountId: BigInt(example.account_id),
  name: null,
  secretHash: 'hash',
  modVersion: null,
  gameVersion: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date()
};

const uniqueViolation = (index: string) =>
  new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { index } } } }
  });

const duplicate = () => uniqueViolation(MOD_INGEST.battleUniqueConstraint);

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const expected = mock<ExpectedValuesService>();
  const webhooks = mock<WebhookEmitter>();

  const created = new Set<bigint>();

  const isWritten = matches<Prisma.BattleCreateArgs>(({ data }) => {
    const id = BigInt(data.arenaUniqueId);

    if (created.has(id)) {
      return true;
    }

    created.add(id);

    return false;
  });

  prisma.$transaction.mockImplementation(async (run) => run(prisma));
  prisma.battle.create.calledWith(isWritten).mockRejectedValue(duplicate());

  prisma.battle.findMany.mockResolvedValue(battleEvents.map((event) => mock<Battle>({ tankId: event.vehicle.tank_id, result: 'win' })));
  expected.all.mockResolvedValue(new Map());

  const service = new ModIngestService(prisma, new EventLedgerService(new RedisMock()), expected, webhooks);

  return { service, prisma, webhooks };
};

const incrementedSessions = (prisma: ReturnType<typeof createService>['prisma']) =>
  prisma.playSession.update.mock.calls.filter(([{ data }]) => 'battles' in data).length;

describe('ModIngestService', () => {
  it('accepts every event of a fresh batch', async () => {
    const { service, prisma } = createService();

    const result = await service.ingest({ device, batch: example });

    expect(result.accepted).toBe(example.events.length);
    expect(result.duplicates).toBe(0);
    expect(prisma.battle.create).toHaveBeenCalledTimes(battleEvents.length);
  });

  it('counts a replayed batch as duplicates and writes nothing twice', async () => {
    const { service, prisma } = createService();

    await service.ingest({ device, batch: example });

    const sessionIncrements = incrementedSessions(prisma);
    const replay = await service.ingest({ device, batch: { ...example, batch_id: 'retry-with-new-batch-id' } });

    expect(replay.accepted).toBe(0);
    expect(replay.duplicates).toBe(example.events.length);
    expect(incrementedSessions(prisma)).toBe(sessionIncrements);
  });

  it('fails the batch instead of dropping the battle when another unique constraint is violated', async () => {
    const { service, prisma } = createService();
    const [battle] = battleEvents;

    prisma.battle.create.mockRejectedValue(uniqueViolation('play_session_pkey'));

    await expect(service.ingest({ device, batch: { ...example, events: battle ? [battle] : [] } })).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError
    );
  });

  it('opens the live session without a read-then-insert that a concurrent batch could race', async () => {
    const { service, prisma } = createService();
    const [battle] = battleEvents;

    await service.ingest({ device, batch: { ...example, events: battle ? [battle] : [] } });

    expect(prisma.playSession.upsert).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
  });

  it('accepts only the new events of a partly seen batch', async () => {
    const { service } = createService();
    const [, ...rest] = example.events;

    await service.ingest({ device, batch: { ...example, events: rest } });

    const result = await service.ingest({ device, batch: example });

    expect(result.accepted).toBe(example.events.length - rest.length);
    expect(result.duplicates).toBe(rest.length);
  });

  it('reports the session the battles belong to', async () => {
    const { service } = createService();
    const [battle] = battleEvents;

    const result = await service.ingest({ device, batch: example });

    expect(battle?.type === 'battle_result' ? battle.session_id : null).toBe(result.session?.session_id);
    expect(result.session?.battles).toBe(battleEvents.length);
  });

  it('stores the marks and percent the battle reported', async () => {
    const { service, prisma } = createService();
    const { event, moe } = moeBattle();

    await service.ingest({ device, batch: { ...example, events: [event] } });

    expect(prisma.playerTank.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ marksOnGun: moe.marks_on_gun, moePercent: moePercent(moe.damage_rating) })
      })
    );
  });

  it('updates only the MoE columns of the player tank', async () => {
    const { service, prisma } = createService();
    const { event } = moeBattle();

    await service.ingest({ device, batch: { ...example, events: [event] } });

    const update = prisma.playerTank.upsert.mock.calls[0]?.[0].update ?? {};

    expect(Object.keys(update).sort()).toEqual(['marksOnGun', 'moeMovingDamage', 'moePercent', 'moeUpdatedAt']);
  });

  it('announces a mark the player did not have before', async () => {
    const { service, prisma, webhooks } = createService();
    const { event, moe } = moeBattle();
    const previousMarks = moe.marks_on_gun - 1;

    prisma.playerTank.findUnique.mockResolvedValue(mock<PlayerTank>({ marksOnGun: previousMarks }));

    await service.ingest({ device, batch: { ...example, events: [event] } });

    expect(webhooks.emit).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'mark.gained', data: expect.objectContaining({ marks: moe.marks_on_gun, previousMarks }) })
    );
  });

  it('stays quiet when the marks did not change', async () => {
    const { service, prisma, webhooks } = createService();
    const { event, moe } = moeBattle();

    prisma.playerTank.findUnique.mockResolvedValue(mock<PlayerTank>({ marksOnGun: moe.marks_on_gun }));

    await service.ingest({ device, batch: { ...example, events: [event] } });

    expect(webhooks.emit).not.toHaveBeenCalled();
  });

  it('does not announce the first mark it ever sees for a tank', async () => {
    const { service, prisma, webhooks } = createService();
    const { event } = moeBattle();

    prisma.playerTank.findUnique.mockResolvedValue(null);

    await service.ingest({ device, batch: { ...example, events: [event] } });

    expect(webhooks.emit).not.toHaveBeenCalled();
  });

  it('rethrows a battle write failure that is not a duplicate', async () => {
    const { service, prisma } = createService();
    const { event } = moeBattle();

    prisma.battle.create.mockRejectedValue(new Error('db down'));

    await expect(service.ingest({ device, batch: { ...example, events: [event] } })).rejects.toThrow('db down');
  });

  it('releases a ledgered event that failed so a retry accepts it', async () => {
    const { service, prisma } = createService();
    const snapshot = moeSnapshot();
    const batch = { ...example, events: [snapshot] };

    prisma.playerTank.upsert.mockRejectedValueOnce(new Error('db down'));

    await expect(service.ingest({ device, batch })).rejects.toThrow('db down');
    await expect(service.ingest({ device, batch })).resolves.toMatchObject({ accepted: 1, duplicates: 0 });
  });
});

describe('ModIngestService side channels', () => {
  const battleStart: IngestEvent = { type: 'battle_start', event_id: 'start-1', occurred_at: example.sent_at, tank_id: 1 };

  it('forwards a battle start to the battle events sink once', async () => {
    const { prisma } = createService();
    const sink = mock<BattleEventsSink>();
    const service = new ModIngestService(
      prisma,
      new EventLedgerService(new RedisMock()),
      mock<ExpectedValuesService>(),
      mock<WebhookEmitter>(),
      sink
    );

    const batch = { ...example, events: [battleStart] };

    await service.ingest({ device, batch });
    await service.ingest({ device, batch });

    expect(sink.started).toHaveBeenCalledOnce();
    expect(sink.started).toHaveBeenCalledWith({ accountId: device.accountId, tankId: 1, occurredAt: new Date(example.sent_at * 1000) });
  });

  it('accepts a battle start when no sink is registered', async () => {
    const { service } = createService();

    await expect(service.ingest({ device, batch: { ...example, events: [battleStart] } })).resolves.toMatchObject({ accepted: 1 });
  });

  it('keeps the ingest successful when the mark webhook cannot be queued', async () => {
    const { service, prisma, webhooks } = createService();
    const snapshot = moeSnapshot();

    prisma.playerTank.findUnique.mockResolvedValue(mock<PlayerTank>({ marksOnGun: snapshot.marks_on_gun - 1 }));
    prisma.player.findUnique.mockResolvedValue(null);
    webhooks.emit.mockRejectedValue(new Error('redis down'));

    await expect(service.ingest({ device, batch: { ...example, events: [snapshot] } })).resolves.toMatchObject({ accepted: 1 });

    expect(webhooks.emit).toHaveBeenCalledWith(
      expect.objectContaining({ subject: { accountIds: [Number(device.accountId)], clanIds: [] }, data: expect.objectContaining({ nickname: null }) })
    );
  });
});
