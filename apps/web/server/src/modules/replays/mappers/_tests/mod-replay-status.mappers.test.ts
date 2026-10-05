import { modReplayStatusesSchema, modReplayStatusSchema } from '@otmetki/schemas';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { ModReplayStatusRow } from '../../selects/mod-replay-status.types';

import { parseReplaySummary } from '../../../../lib/replay';
import { FIXTURE, readFixture } from '../../../../lib/replay/_tests/fixtures';
import { toModReplayStatus } from '../mod-replay-status.mappers';

const contractExample = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../../../../game/modpack/contract/examples/${name}`, import.meta.url), 'utf8'));

const full = parseReplaySummary(readFixture(FIXTURE.wgFull));
const recorder = full.players.find((player) => player.isRecorder)?.result;

const row = (overrides: Partial<ModReplayStatusRow> = {}): ModReplayStatusRow => ({
  id: '0f8e2d4c-6b1a-4f3e-9d2c-7a5b3c1d9e8f',
  status: 'parsed',
  damageDealt: recorder?.damageDealt ?? null,
  summary: { ...full, warnings: [] },
  ...overrides
});

describe('toModReplayStatus', () => {
  it('summarises the recorder battle of a parsed replay', () => {
    const status = toModReplayStatus(row());

    expect(modReplayStatusSchema.parse(status)).toEqual(status);

    expect(status.highlights).toEqual({
      accuracy: recorder && recorder.shots > 0 ? Math.min(100, (recorder.hits * 100) / recorder.shots) : null,
      damage: recorder?.damageDealt,
      penetrations: recorder?.penetrations
    });
  });

  it('has no highlights before the replay is parsed', () => {
    expect(toModReplayStatus(row({ status: 'parsing' })).highlights).toBeNull();
    expect(toModReplayStatus(row({ status: 'failed' })).highlights).toBeNull();
  });

  it('keeps the damage column when the stored summary cannot be read', () => {
    expect(toModReplayStatus(row({ summary: { broken: true }, damageDealt: 2150 })).highlights).toEqual({
      accuracy: null,
      damage: 2150,
      penetrations: null
    });
  });

  it('answers null highlights when nothing is known about the battle', () => {
    expect(toModReplayStatus(row({ summary: null, damageDealt: null })).highlights).toBeNull();
  });
});

describe('the replay analysis contract example', () => {
  it('parses against the answer the server serialises through', () => {
    expect(modReplayStatusesSchema.safeParse(contractExample('replay-analysis.example.json')).success).toBe(true);
  });
});
