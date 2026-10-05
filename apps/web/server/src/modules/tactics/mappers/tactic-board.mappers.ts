import type { BoardAccess, TacticBoardView } from '../tactics.types';

import { readBoardData } from '../lib/board-document/board-document';

export const toTacticBoardView = ({ board, role }: BoardAccess): TacticBoardView => ({
  id: board.id,
  title: board.title,
  arenaId: board.arenaId,
  mode: board.mode,
  visibility: board.visibility,
  data: readBoardData(board.data),
  role,
  shareToken: role === 'owner' ? board.shareToken : null,
  editToken: role === 'owner' || role === 'edit' ? board.editToken : null,
  updatedAt: board.updatedAt.toISOString()
});
