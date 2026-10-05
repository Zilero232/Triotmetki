import * as Y from 'yjs';

import type { TacticBoardData } from '../../tactics.types';
import type { BoardIdOfInput, RestoreBoardInput, SeedBoardInput } from './board-document.types';

import { BOARD_DOCUMENT } from '../../config/tactics.constants';
import { tacticBoardDataSchema } from '../../dto/tactics.schemas';

export const readBoardData = (value: unknown): TacticBoardData => {
  const parsed = tacticBoardDataSchema.safeParse(value);

  return parsed.success ? parsed.data : { layers: [] };
};

export const seedBoardDocument = ({ document, data }: SeedBoardInput): void => {
  const layers = document.getArray<unknown>(BOARD_DOCUMENT.layersKey);

  if (layers.length === 0 && data.layers.length > 0) {
    layers.push(data.layers);
  }
};

export const replaceBoardLayers = ({ document, data }: SeedBoardInput): void => {
  const layers = document.getArray<unknown>(BOARD_DOCUMENT.layersKey);

  document.transact(() => {
    layers.delete(0, layers.length);
    layers.push(data.layers);
  });
};

export const boardSnapshot = (document: Y.Doc): TacticBoardData | null => {
  const parsed = tacticBoardDataSchema.safeParse({ layers: document.getArray<unknown>(BOARD_DOCUMENT.layersKey).toJSON() });

  return parsed.success ? parsed.data : null;
};

export const encodeBoard = (document: Y.Doc): Uint8Array => Y.encodeStateAsUpdate(document);

export const restoreBoard = ({ document, state }: RestoreBoardInput): void => {
  Y.applyUpdate(document, state);
};

export const boardIdOf = ({ prefix, name }: BoardIdOfInput): string | null => {
  const id = name.startsWith(prefix) ? name.slice(prefix.length) : '';

  return /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id) ? id : null;
};
