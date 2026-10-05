import { describe, expect, it } from 'vitest';

import { parsePackets, parseReplaySummary } from '../../../../../lib/replay';
import { FIXTURE, readFixture } from '../../../../../lib/replay/_tests/fixtures';
import { buildTracks, downsample } from '../replay-tracks';
import { REPLAY_TRACKS } from '../replay-tracks.constants';

const point = (time: number) => ({ time, x: time, y: 0, z: -time, yaw: 0, pitch: 0, roll: 0 });

describe('downsample', () => {
  it('keeps at most one sample per step', () => {
    const samples = downsample({ points: [point(0), point(0.4), point(0.9), point(1), point(2.5)], stepSeconds: 1 });

    expect(samples.map(([time]) => time)).toEqual([0, 1, 2.5]);
  });

  it('caps a track so a crafted replay cannot grow it without bound', () => {
    const points = Array.from({ length: REPLAY_TRACKS.maxSamples + 10 }, (_, index) => point(index));

    expect(downsample({ points, stepSeconds: 1 })).toHaveLength(REPLAY_TRACKS.maxSamples);
  });

  it('returns nothing for an empty track', () => {
    expect(downsample({ points: [], stepSeconds: 1 })).toEqual([]);
  });
});

describe('buildTracks', () => {
  it('builds one track per player seen moving in a real replay', () => {
    const bytes = readFixture(FIXTURE.wgFull);
    const summary = parseReplaySummary(bytes);
    const { packets } = parsePackets({ replay: bytes, kinds: ['position'] });
    const tracks = buildTracks({ packets, players: summary.players, stepSeconds: 1 });

    expect(tracks.length).toBe(summary.players.length);

    for (const track of tracks) {
      const times = track.points.map(([time]) => time);

      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });
});
