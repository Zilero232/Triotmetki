import type { PlayerMarks } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { PlayerMarksReaderService } from '../../../players';

import { AppNotFoundException } from '../../../../common/exceptions';
import { UserAccountsReaderService } from '../../../accounts';
import { MyMarksReaderService } from '../my-marks-reader.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const playerMarks = mock<PlayerMarksReaderService>();

  return { service: new MyMarksReaderService(new UserAccountsReaderService(prisma), playerMarks), prisma, playerMarks };
};

describe('MyMarksReaderService', () => {
  it('answers 404 without a linked account', async () => {
    const { service, prisma, playerMarks } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.marks('user')).rejects.toBeInstanceOf(AppNotFoundException);
    expect(playerMarks.marks).not.toHaveBeenCalled();
  });

  it('reads the marks of the primary account first', async () => {
    const { service, prisma, playerMarks } = createService();
    const marks = mock<PlayerMarks>();

    prisma.userLestaAccount.findFirst.mockResolvedValue(mock<UserLestaAccount>({ accountId: 7n }));
    playerMarks.marks.mockResolvedValue(marks);

    await expect(service.marks('user')).resolves.toBe(marks);
    expect(playerMarks.marks).toHaveBeenCalledWith(7n);

    expect(prisma.userLestaAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user' }, orderBy: [{ isPrimary: 'desc' }, { linkedAt: 'asc' }] })
    );
  });
});
