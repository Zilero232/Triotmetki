import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import type { OwnedById } from '../../community-core';
import type {
  BoardAccess,
  BoardState,
  CreateTacticBoardRequest,
  OpenBoardInput,
  StoreBoardInput,
  TacticBoardView,
  UpdateTacticBoardRequest
} from '../tactics.types';

import { AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { TACTICS } from '../config/tactics.constants';
import { boardRole, canEdit } from '../lib/board-access/board-access';
import { readBoardData } from '../lib/board-document/board-document';
import { toTacticBoardView } from '../mappers/tactic-board.mappers';
import { BoardLiveService } from './board-live.service';

@Injectable()
export class TacticBoardWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: BoardLiveService
  ) {}

  async mine(userId: string): Promise<TacticBoardView[]> {
    const boards = await this.prisma.tacticBoard.findMany({ where: { ownerUserId: userId }, orderBy: { updatedAt: 'desc' } });

    return boards.map((board) => toTacticBoardView({ board, role: 'owner' }));
  }

  async create({ userId, title, arenaId, mode, visibility, data }: CreateTacticBoardRequest): Promise<TacticBoardView> {
    const count = await this.prisma.tacticBoard.count({ where: { ownerUserId: userId } });

    if (count >= TACTICS.maxBoardsPerUser) {
      throw new AppConflictException('CONFLICT', 'Too many boards, delete some first');
    }

    const board = await this.prisma.tacticBoard.create({
      data: { ownerUserId: userId, title, arenaId: arenaId ?? null, mode: mode ?? null, visibility, data: toJsonValue(data) }
    });

    return toTacticBoardView({ board, role: 'owner' });
  }

  async open({ id, userId, token }: OpenBoardInput): Promise<TacticBoardView> {
    const { board, role } = await this.access({ id, userId, token });

    return toTacticBoardView({ board, role });
  }

  async update({ id, userId, token, title, arenaId, mode, visibility, data }: UpdateTacticBoardRequest): Promise<TacticBoardView> {
    const { board: current, role } = await this.access({ id, userId, token });

    if (!canEdit(role)) {
      throw new AppForbiddenException('FORBIDDEN', 'This link is view-only');
    }

    if (current.hiddenAt && visibility !== undefined && visibility !== 'private') {
      throw new AppForbiddenException('FORBIDDEN', 'A moderator hid this board');
    }

    const ownerChanges = role === 'owner' ? { title, arenaId, mode, visibility } : {};
    const isLive = data !== undefined && this.live.replaceData({ id, data });
    const dataChanges = data === undefined ? {} : isLive ? { data: toJsonValue(data) } : { data: toJsonValue(data), document: null };
    const board = await this.prisma.tacticBoard.update({ where: { id }, data: { ...ownerChanges, ...dataChanges } });

    if (visibility !== undefined && role === 'owner' && visibility !== current.visibility) {
      this.live.close(id);
    }

    return toTacticBoardView({ board, role });
  }

  async remove({ id, userId }: OwnedById): Promise<void> {
    const { count } = await this.prisma.tacticBoard.deleteMany({ where: { id, ownerUserId: userId } });

    if (count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No board ${id} of yours`);
    }

    this.live.close(id);
  }

  async rotateTokens({ id, userId }: OwnedById): Promise<TacticBoardView> {
    const { count } = await this.prisma.tacticBoard.updateMany({
      where: { id, ownerUserId: userId },
      data: { shareToken: randomBytes(16).toString('hex'), editToken: randomBytes(16).toString('hex') }
    });

    if (count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No board ${id} of yours`);
    }

    this.live.close(id);

    return this.open({ id, userId, token: null });
  }

  async access({ id, userId, token }: OpenBoardInput): Promise<BoardAccess> {
    const board = await this.prisma.tacticBoard.findUnique({ where: { id } });
    const role = board ? boardRole({ board, userId, token }) : null;

    if (!board || !role) {
      throw new AppNotFoundException('NOT_FOUND', `No board ${id}`);
    }

    return { board, role };
  }

  async loadState(id: string): Promise<BoardState> {
    const board = await this.prisma.tacticBoard.findUniqueOrThrow({ where: { id }, select: { document: true, data: true } });

    return { state: board.document ? new Uint8Array(board.document) : null, data: readBoardData(board.data) };
  }

  async storeState({ id, state, snapshot }: StoreBoardInput): Promise<void> {
    await this.prisma.tacticBoard.updateMany({
      where: { id },
      data: { document: Buffer.from(state), ...(snapshot ? { data: toJsonValue(snapshot) } : {}) }
    });
  }
}
