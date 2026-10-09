import * as z from 'zod';

import { zCreateTacticBoard } from '@/entities/tactic/board';

import type { BoardMapLookupInput, BoardSettingsPayload, BoardSettingsSource, BoardSettingsValues } from './board-settings.types';

import { BOARD_SETTINGS, TACTIC_VISIBILITIES } from '../../config';

export const boardSettingsSchema = z.object({
  title: z.string().trim().pipe(zCreateTacticBoard.shape.title),
  arenaId: z.string(),
  mode: z.string(),
  visibility: z.enum(TACTIC_VISIBILITIES)
});

export const toBoardSettingsValues = (board: BoardSettingsSource | null): BoardSettingsValues => ({
  title: board?.title ?? '',
  arenaId: board?.arenaId ?? BOARD_SETTINGS.none,
  mode: board?.mode ?? BOARD_SETTINGS.none,
  visibility: board?.visibility ?? 'unlisted'
});

const optional = (value: string) => (value === BOARD_SETTINGS.none || value.length === 0 ? undefined : value);

export const toBoardSettingsPayload = ({ title, arenaId, mode, visibility }: BoardSettingsValues): BoardSettingsPayload => {
  const payload: BoardSettingsPayload = { title: title.trim(), visibility };
  const map = optional(arenaId);
  const gameMode = optional(mode);

  return { ...payload, ...(map ? { arenaId: map } : {}), ...(gameMode ? { mode: gameMode } : {}) };
};

export const findBoardMap = ({ maps, arenaId }: BoardMapLookupInput) =>
  arenaId === null ? null : (maps.find((map) => map.arenaId === arenaId) ?? null);

export const boardModeOptions = ({ maps, arenaId }: BoardMapLookupInput): readonly string[] => {
  const map = findBoardMap({ maps, arenaId });

  return map && map.modes.length > 0 ? map.modes : BOARD_SETTINGS.fallbackModes;
};
