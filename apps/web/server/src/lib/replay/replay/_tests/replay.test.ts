import { describe, expect, it } from 'vitest';

import { ARENA_UNIQUE_ID, FIXTURE, LESTA_ARENA, LESTA_BATTLE, lestaResultsJson, readFixture } from '../../_tests/fixtures';
import { buildReplay } from '../../_tests/replay-builder';
import { arenaBlockSchema } from '../../header/header.schemas';
import { replaySummarySchema } from '../../summary/summary.schemas';
import { parseReplay, parseReplaySummary } from '../replay';

const lestaReplay = (withResults: boolean) => buildReplay({ blocks: withResults ? [LESTA_ARENA, lestaResultsJson()] : [LESTA_ARENA] });

describe('parseReplay on a real WG 1.26 replay with battle results', () => {
  const parsed = parseReplay(readFixture(FIXTURE.wgFull));
  const { summary } = parsed;
  const recorder = summary.players.find((player) => player.isRecorder);

  it('produces a summary that satisfies its own schema', () => {
    expect(replaySummarySchema.safeParse(summary).success).toBe(true);
    expect(parsed.warnings).toEqual([]);
  });

  it('identifies the client, map and battle', () => {
    expect(summary.game).toBe('wg');
    expect(summary.clientVersion.numbers).toEqual([1, 26, 0, 2]);
    expect(summary.map.id).toBe(parsed.header.arena.mapName);
    expect(summary.isComplete).toBe(true);
    expect(summary.durationSeconds).toBeGreaterThan(0);
    expect(summary.arenaUniqueId).toMatch(/^\d{17}$/);
  });

  it('lists every vehicle from the arena block, split into two teams', () => {
    const arena = arenaBlockSchema.parse(parsed.header.arena);

    expect(summary.players).toHaveLength(Object.keys(arena.vehicles).length);
    expect(new Set(summary.players.map((player) => player.team))).toEqual(new Set([1, 2]));
    expect(summary.players.every((player) => player.result !== null && player.tankId !== null)).toBe(true);
  });

  it('matches the recorder to its vehicle and its personal results', () => {
    const recorderResults = parsed.header.results?.results.vehicles?.[String(summary.recorder.vehicleId)];

    expect(recorder?.vehicleId).toBe(summary.recorder.vehicleId);
    expect(recorder?.accountId).toBe(summary.recorder.accountId);
    expect(recorder?.name).toBe(summary.recorder.name);
    expect(recorder?.result?.damageDealt).toBe(recorderResults?.[0]?.damageDealt);
  });

  it('derives the outcome from the winner team and the recorder team', () => {
    const expected = summary.winnerTeam === summary.recorder.team ? 'win' : 'loss';

    expect(summary.outcome).toBe(expected);
  });
});

describe('parseReplay on a real WG 1.14 replay without battle results', () => {
  const { summary, header } = parseReplay(readFixture(FIXTURE.wgIncomplete));

  it('marks the replay incomplete and leaves results empty', () => {
    expect(header.blockCount).toBe(1);
    expect(header.results).toBeNull();
    expect(summary.isComplete).toBe(false);
    expect(summary.outcome).toBeNull();
    expect(summary.winnerTeam).toBeNull();
    expect(summary.players.every((player) => player.result === null)).toBe(true);
  });

  it('still finds the recorder among the players by name', () => {
    const recorder = summary.players.find((player) => player.isRecorder);

    expect(recorder?.name).toBe(header.arena.playerName);
    expect(summary.recorder.vehicleId).toBe(recorder?.vehicleId);
  });
});

describe('parseReplay on a synthetic Lesta replay', () => {
  it('recognises the Lesta client and parses the Russian date', () => {
    const summary = parseReplaySummary(lestaReplay(false));

    expect(summary.game).toBe('lesta');
    expect(summary.clientVersion.label).toBe('1.30.0.0');
    expect(summary.startedAt).toBe('2026-09-24T18:05:07');
    expect(summary.map.name).toBe(LESTA_ARENA.mapDisplayName);
  });

  it('maps players, clan tags and per-player results from the results block', () => {
    const summary = parseReplaySummary(lestaReplay(true));
    const byName = new Map(summary.players.map((player) => [player.name, player]));
    const enemy = byName.get('Enemy');

    expect(summary.arenaUniqueId).toBe(ARENA_UNIQUE_ID);
    expect(summary.outcome).toBe('win');
    expect(byName.get('Ally')?.clanTag).toBeNull();
    expect(enemy?.clanTag).toBe(LESTA_ARENA.vehicles['502'].clanAbbrev);
    expect(enemy?.accountId).toBe(LESTA_BATTLE.vehicles['502'][0]?.accountDBID);
    expect(enemy?.result?.survived).toBe(false);
    expect(enemy?.result?.killerVehicleId).toBe(summary.recorder.vehicleId);
    expect(byName.get('Ally')?.result?.survived).toBe(true);
  });

  it('prefers the personal block for the recorder xp and credits', () => {
    const summary = parseReplaySummary(lestaReplay(true));
    const recorder = summary.players.find((player) => player.isRecorder);
    const personal = LESTA_BATTLE.personal['1'];

    expect(recorder?.result?.xp).toBe(personal.xp);
    expect(recorder?.result?.credits).toBe(personal.credits);
  });

  it('keeps going and warns when the results block has an unexpected shape', () => {
    const parsed = parseReplay(buildReplay({ blocks: [LESTA_ARENA, [{ common: 'broken' }]] }));

    expect(parsed.summary.isComplete).toBe(false);
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.header.extraBlocks).toHaveLength(1);
  });
});
