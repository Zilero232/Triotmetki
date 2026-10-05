import type { MapDetail, MapRef, MapSummary } from '@otmetki/schemas';

import type { ArenaRow, MinimapUrlInput, ToMapDetailInput, ToMapRefInput } from './map-detail.types';

import { MINIMAP } from '../config/maps.constants';
import { arenaDataSchema } from '../dto/maps.schemas';

const validUrl = (value: string | null): string | null => (value && URL.canParse(value) ? value : null);

export const minimapUrl = ({ image, path }: MinimapUrlInput): string | null => {
  const base = validUrl(image);

  if (!base || !path) {
    return base;
  }

  const root = base.lastIndexOf(MINIMAP.directory);

  return root === -1 ? base : `${base.slice(0, root)}${path}`;
};

export const toMapSummary = (arena: ArenaRow): MapSummary => ({
  arenaId: arena.arenaId,
  slug: arena.slug,
  name: arena.name,
  nameEn: arena.nameEn,
  image: validUrl(arena.image),
  sizeMeters: arena.sizeMeters,
  camouflage: arena.camouflageType,
  modes: arena.modes
});

export const toMapDetail = ({ arena, stats }: ToMapDetailInput): MapDetail => {
  const parsed = arenaDataSchema.safeParse(arena.data ?? {});
  const data = parsed.success ? parsed.data : null;

  return {
    ...toMapSummary(arena),
    description: arena.description,
    descriptionEn: arena.descriptionEn,
    boundingBox: data?.boundingBox ?? null,
    maxPlayersInTeam: data?.maxPlayersInTeam ?? null,
    roundLengthSec: data?.roundLength ?? null,
    gameModes: (data?.gameplay ?? []).map((mode) => ({
      mode: mode.type,
      minimap: minimapUrl({ image: arena.image, path: mode.minimapImage }),
      bases: mode.teamBasePositions,
      spawns: mode.teamSpawnPoints,
      controlPoints: mode.controlPoints
    })),
    stats
  };
};

export const toMapRef = ({ arena, arenaId }: ToMapRefInput): MapRef =>
  arena
    ? { arenaId: arena.arenaId, slug: arena.slug, name: arena.name, nameEn: arena.nameEn, image: validUrl(arena.image) }
    : { arenaId, slug: arenaId, name: arenaId, nameEn: null, image: null };
