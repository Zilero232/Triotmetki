import type { BuildTracksInput, DownsampleInput, ReplayTrack, TrackSample } from './replay-tracks.types';

import { collectTracks } from '../../../../lib/replay';
import { REPLAY_TRACKS } from './replay-tracks.constants';

const round = (value: number): number => Math.round(value * REPLAY_TRACKS.coordinateScale) / REPLAY_TRACKS.coordinateScale;

export const downsample = ({ points, stepSeconds }: DownsampleInput): TrackSample[] => {
  const samples: TrackSample[] = [];
  let lastTime = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    if (samples.length >= REPLAY_TRACKS.maxSamples) {
      break;
    }

    if (point.time - lastTime < stepSeconds) {
      continue;
    }

    samples.push([round(point.time), round(point.x), round(point.z)]);
    lastTime = point.time;
  }

  return samples;
};

export const buildTracks = ({ packets, players, stepSeconds }: BuildTracksInput): ReplayTrack[] => {
  const tracks = collectTracks({ packets: [...packets], vehicleIds: new Set(players.map((player) => player.vehicleId)) });

  return players.flatMap((player) => {
    const points = downsample({ points: tracks.get(player.vehicleId) ?? [], stepSeconds });

    if (points.length === 0) {
      return [];
    }

    return [
      {
        vehicleId: player.vehicleId,
        accountId: player.accountId,
        name: player.name,
        team: player.team,
        tankId: player.tankId,
        vehicleType: player.vehicleType,
        points
      }
    ];
  });
};
