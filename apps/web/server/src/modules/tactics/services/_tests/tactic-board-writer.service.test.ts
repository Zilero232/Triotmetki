import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TacticBoard } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../../common/exceptions';
import { TACTICS } from '../../config/tactics.constants';
import { BoardLiveService } from '../board-live.service';
import { TacticBoardWriterService } from '../tactic-board-writer.service';

const shareToken = 'share-token-0000000000000000000000';
const editToken = 'edit-token-00000000000000000000000';
const data = { layers: [] };

const board: TacticBoard = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  ownerUserId: 'owner',
  arenaId: null,
  mode: null,
  title: 'Prokhorovka',
  data,
  document: null,
  shareToken,
  editToken,
  visibility: 'unlisted',
  hiddenAt: null,
  createdAt: new Date('2026-09-25T12:00:00Z'),
  updatedAt: new Date('2026-09-25T12:00:00Z')
};

const createService = (row: TacticBoard | null = board) => {
  const prisma = mockDeep<PrismaService>();

  prisma.tacticBoard.findUnique.mockResolvedValue(row);
  prisma.tacticBoard.update.mockResolvedValue(board);

  const live = mock<BoardLiveService>();

  live.replaceData.mockReturnValue(false);

  return { service: new TacticBoardWriterService(prisma, live), prisma, live };
};

describe('TacticBoardWriterService.update', () => {
  it('refuses a view-only token', async () => {
    const { service, prisma } = createService();

    await expect(service.update({ id: board.id, userId: null, token: shareToken, data })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.tacticBoard.update).not.toHaveBeenCalled();
  });

  it('lets an editor change the drawing but not the title or visibility', async () => {
    const { service, prisma } = createService();

    await service.update({ id: board.id, userId: null, token: editToken, title: 'Renamed', visibility: 'public', data });

    expect(prisma.tacticBoard.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: board.id }), data: expect.objectContaining({ data, document: null }) })
    );
  });

  it('lets the owner change the title and visibility', async () => {
    const { service, prisma } = createService();

    await service.update({ id: board.id, userId: 'owner', token: null, title: 'Renamed', visibility: 'public' });

    expect(prisma.tacticBoard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: board.id }),
        data: expect.objectContaining({ title: 'Renamed', visibility: 'public' })
      })
    );
  });

  it('refuses to reopen a board a moderator hid', async () => {
    const { service, prisma } = createService({ ...board, visibility: 'private', hiddenAt: new Date() });

    await expect(service.update({ id: board.id, userId: 'owner', token: null, visibility: 'public' })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.tacticBoard.update).not.toHaveBeenCalled();
  });

  it('keeps the stored document when the drawing is not sent', async () => {
    const { service, prisma } = createService();

    await service.update({ id: board.id, userId: 'owner', token: null, title: 'Renamed' });

    expect(prisma.tacticBoard.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: board.id }, data: expect.not.objectContaining({ document: null }) })
    );
  });
});

describe('TacticBoardWriterService.open', () => {
  it('shows both tokens to the owner', async () => {
    const { service } = createService();

    expect(await service.open({ id: board.id, userId: 'owner', token: null })).toMatchObject({ role: 'owner', shareToken, editToken });
  });

  it('shows an editor only the edit token', async () => {
    const { service } = createService();

    expect(await service.open({ id: board.id, userId: 'stranger', token: editToken })).toMatchObject({ role: 'edit', shareToken: null, editToken });
  });

  it('shows a viewer no tokens', async () => {
    const { service } = createService();

    expect(await service.open({ id: board.id, userId: null, token: shareToken })).toMatchObject({ role: 'view', shareToken: null, editToken: null });
  });

  it('hides an unlisted board from a visitor without a token', async () => {
    const { service } = createService();

    await expect(service.open({ id: board.id, userId: 'stranger', token: null })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('refuses a wrong token', async () => {
    const { service } = createService();

    await expect(service.open({ id: board.id, userId: null, token: 'wrong-token-000000000000000000000' })).rejects.toBeInstanceOf(
      AppNotFoundException
    );
  });

  it('lets anyone view a public board without tokens', async () => {
    const { service } = createService({ ...board, visibility: 'public' });

    expect(await service.open({ id: board.id, userId: null, token: null })).toMatchObject({ role: 'view', shareToken: null, editToken: null });
  });
});

describe('TacticBoardWriterService.create', () => {
  it('refuses a user at the board limit', async () => {
    const { service, prisma } = createService();

    prisma.tacticBoard.count.mockResolvedValue(TACTICS.maxBoardsPerUser);

    await expect(service.create({ userId: 'owner', title: 'Board', visibility: 'unlisted', data })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.tacticBoard.create).not.toHaveBeenCalled();
  });

  it('creates a board just below the limit', async () => {
    const { service, prisma } = createService();

    prisma.tacticBoard.count.mockResolvedValue(TACTICS.maxBoardsPerUser - 1);
    prisma.tacticBoard.create.mockResolvedValue(board);

    expect((await service.create({ userId: 'owner', title: 'Board', visibility: 'unlisted', data })).role).toBe('owner');
  });
});

describe('TacticBoardWriterService live collaboration', () => {
  it('applies a REST drawing through the live document instead of dropping it', async () => {
    const { service, prisma, live } = createService();

    live.replaceData.mockReturnValue(true);

    await service.update({ id: board.id, userId: null, token: editToken, data });

    expect(live.replaceData).toHaveBeenCalledWith({ id: board.id, data });

    expect(prisma.tacticBoard.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: board.id }), data: expect.objectContaining({ data }) })
    );
  });

  it('closes live connections when the owner changes the visibility, rotates the links or deletes the board', async () => {
    const { service, prisma, live } = createService();

    prisma.tacticBoard.updateMany.mockResolvedValue({ count: 1 });
    prisma.tacticBoard.deleteMany.mockResolvedValue({ count: 1 });

    await service.update({ id: board.id, userId: 'owner', token: null, visibility: 'private' });
    await service.rotateTokens({ id: board.id, userId: 'owner' });
    await service.remove({ id: board.id, userId: 'owner' });

    expect(live.close).toHaveBeenCalledTimes(3);
  });

  it('keeps live connections when the visibility stays the same', async () => {
    const { service, live } = createService();

    await service.update({ id: board.id, userId: 'owner', token: null, visibility: board.visibility, title: 'Renamed' });

    expect(live.close).not.toHaveBeenCalled();
  });
});
