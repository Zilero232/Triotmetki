import { describe, expect, it } from 'vitest';

import type { ReplayRow } from '../replay-view.types';

import { parseReplaySummary } from '../../../../lib/replay';
import { FIXTURE, readFixture } from '../../../../lib/replay/_tests/fixtures';
import { REPLAY_LINKS } from '../../config/links.constants';
import { toReplayView } from '../replay-view.mappers';

const summary = parseReplaySummary(readFixture(FIXTURE.wgFull));
const apiUrl = 'https://api.example.test';

const row = (fields: Partial<ReplayRow> = {}): ReplayRow => ({
  id: '00000000-0000-4000-8000-000000000001',
  uploaderUserId: 'uploader',
  status: 'parsed',
  visibility: 'public',
  gameVersion: null,
  arenaId: null,
  mapName: null,
  battleType: null,
  gameplayMode: null,
  playedAt: null,
  result: null,
  damageDealt: null,
  damageAssisted: null,
  frags: null,
  xp: null,
  medals: [],
  tags: [],
  views: 0,
  summary,
  createdAt: new Date('2026-09-20T18:00:00Z'),
  ...fields
});

describe('toReplayView', () => {
  it('takes the owner from the recorder of the stored summary', () => {
    const recorder = summary.players.find((player) => player.isRecorder);

    expect(toReplayView({ replay: row(), apiUrl }).owner?.accountId).toBe(recorder?.accountId);
  });

  it('drops participants without a known account or tank', () => {
    const view = toReplayView({ replay: row(), apiUrl });
    const known = summary.players.filter((player) => (player.accountId ?? 0) > 0 && (player.tankId ?? 0) > 0);

    expect(view.players).toHaveLength(known.length);
  });

  it('shows no players and no duration when the stored summary is unreadable', () => {
    const view = toReplayView({ replay: row({ summary: { broken: true } }), apiUrl });

    expect(view.players).toEqual([]);
    expect(view.owner).toBeNull();
    expect(view.durationSec).toBeNull();
  });

  it('prefers the gameplay mode over the raw battle type', () => {
    expect(toReplayView({ replay: row({ battleType: 'random', gameplayMode: 'ctf' }), apiUrl }).battleType).toBe('ctf');
  });

  it('builds the download link against the API origin', () => {
    const view = toReplayView({ replay: row(), apiUrl });

    expect(view.downloadUrl).toBe(new URL(REPLAY_LINKS.file.replace('{id}', row().id), apiUrl).href);
  });
});

describe('toReplayView owner flag', () => {
  it('marks the replay as owned only for its uploader', () => {
    expect(toReplayView({ replay: row(), apiUrl, viewerUserId: 'uploader' }).isOwner).toBe(true);
    expect(toReplayView({ replay: row(), apiUrl, viewerUserId: 'someone' }).isOwner).toBe(false);
    expect(toReplayView({ replay: row(), apiUrl }).isOwner).toBe(false);
  });
});

describe('toReplayView scoreboard fields', () => {
  const view = toReplayView({ replay: row(), apiUrl });
  const byVehicle = new Map(summary.players.map((player) => [player.vehicleId, player]));

  it('sums radio, track and stun assist into the assisted damage of each player', () => {
    for (const player of view.players) {
      expect(player.damageAssisted).toBe((player.assistRadio ?? 0) + (player.assistTrack ?? 0) + (player.assistStun ?? 0));
    }
  });

  it('keeps the vehicle id so a killer reference resolves to a participant of the battle', () => {
    const killed = view.players.filter((player) => player.killerVehicleId !== null);

    expect(killed.length).toBeGreaterThan(0);

    for (const player of killed) {
      expect(byVehicle.has(player.killerVehicleId ?? -1)).toBe(true);
    }
  });

  it('marks exactly the recorder and reports only destroyed vehicles as having a killer', () => {
    expect(view.players.filter((player) => player.isRecorder)).toHaveLength(1);
    expect(view.players.filter((player) => player.survived === true && player.killerVehicleId !== null)).toEqual([]);
  });

  it('never exposes a life time longer than the battle', () => {
    for (const player of view.players) {
      expect(player.lifeTimeSec ?? 0).toBeLessThanOrEqual(Math.ceil(summary.durationSeconds ?? Number.POSITIVE_INFINITY));
    }
  });

  it('leaves every result field null when a participant has no post-battle result', () => {
    const withoutResult = { ...summary, players: summary.players.map((player) => ({ ...player, result: null })) };
    const player = toReplayView({ replay: row({ summary: withoutResult }), apiUrl }).players[0];

    expect(player?.xp).toBeNull();
    expect(player?.damageAssisted).toBeNull();
    expect(player?.lifeTimeSec).toBeNull();
    expect(player?.killerVehicleId).toBeNull();
    expect(player?.vehicleId).not.toBeNull();
  });
});
