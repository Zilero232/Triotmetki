import type { Configuration } from '@hocuspocus/server';
import type { z } from 'zod';

import type { TacticBoard } from '../../../generated';
import type { ById, Owned } from '../community-core';
import type { createTacticBoardSchema, tacticBoardDataSchema, tacticBoardSchema, updateTacticBoardSchema } from './dto/tactics.schemas';
import type { BoardRole } from './lib/board-access/board-access.types';

export type TacticBoardView = z.infer<typeof tacticBoardSchema>;
export type TacticBoardData = z.infer<typeof tacticBoardDataSchema>;
export type CreateTacticBoardRequest = z.output<typeof createTacticBoardSchema> & Owned;
export type OpenBoardInput = ById & { userId: string | null; token: string | null };
export type UpdateTacticBoardRequest = z.output<typeof updateTacticBoardSchema> & OpenBoardInput;

export type BoardAccess = {
  board: TacticBoard;
  role: BoardRole;
};

export type BoardState = {
  state: Uint8Array | null;
  data: TacticBoardData;
};

export type StoreBoardInput = {
  id: string;
  state: Uint8Array;
  snapshot: TacticBoardData | null;
};

export type CollabContext = {
  boardId: string;
};

export type ReplaceLiveDataInput = {
  id: string;
  data: TacticBoardData;
};

export type CollabDocumentHooks = Required<Pick<Configuration<CollabContext>, 'onAuthenticate' | 'onLoadDocument' | 'onStoreDocument'>>;
