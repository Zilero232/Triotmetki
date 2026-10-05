import type { CompiledQuery } from 'kysely';

import { catalogCosmetics, OVERLAY_THEMES, seasonalCosmeticCode } from '@otmetki/schemas';
import { mock } from 'vitest-mock-extended';

import type { CosmeticOwnership, User } from '../../../../../generated';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { EntitlementsService } from '../../../billing';
import { CosmeticsReaderService } from '../cosmetics-reader.service';
import { CosmeticsWriterService } from '../cosmetics-writer.service';
import { ShellLedgerWriterService } from '../shell-ledger-writer.service';

export const now = new Date('2026-09-26T10:00:00Z');
export const shopBadge = catalogCosmetics().find((item) => item.slot === 'badge' && item.source === 'shop');
export const plusBadge = catalogCosmetics().find((item) => item.slot === 'badge' && item.source === 'plus');
export const defaultBanner = catalogCosmetics().find((item) => item.slot === 'banner' && item.source === 'default');
export const shopTheme = OVERLAY_THEMES.premium.find((theme) =>
  catalogCosmetics().some((item) => item.code === `overlay-${theme}` && item.source === 'shop')
);

export const seasonBadge = seasonalCosmeticCode({ season: '2026-q3', slot: 'badge', grade: 'gold' });

export const owned = (userId: string, code: string) => Object.assign(mock<CosmeticOwnership>(), { userId, code, acquiredAt: now });

export const equipped = (id: string, fields: Partial<Pick<User, 'cosmeticBadge' | 'cosmeticBanner' | 'cosmeticFrame'>>) =>
  Object.assign(mock<User>(), { id, cosmeticBadge: null, cosmeticFrame: null, cosmeticBanner: null, ...fields });

export const setup = ({ isPlus = false, codes = [] }: { isPlus?: boolean; codes?: string[] } = {}) => {
  const queries: CompiledQuery[] = [];
  const prisma = mockPrismaService({ queries });
  const entitlements = mock<EntitlementsService>();
  const ledger = mock<ShellLedgerWriterService>();

  entitlements.isPlus.mockResolvedValue(isPlus);
  ledger.balance.mockResolvedValue(0);
  prisma.cosmeticOwnership.findMany.mockResolvedValue(codes.map((code) => owned('u', code)));
  prisma.cosmeticOwnership.count.mockResolvedValue(codes.length);
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.cosmeticOwnership.findUnique.mockResolvedValue(null);
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  const reader = new CosmeticsReaderService(prisma, entitlements, ledger);

  return { prisma, queries, entitlements, ledger, reader, writer: new CosmeticsWriterService(prisma, entitlements, ledger, reader) };
};
