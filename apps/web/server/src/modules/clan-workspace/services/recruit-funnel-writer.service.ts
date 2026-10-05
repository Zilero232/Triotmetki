import { Injectable } from '@nestjs/common';

import type {
  CandidateStats,
  CandidateView,
  ClanItemScope,
  CreateCandidateRequest,
  ListCandidatesRequest,
  UpdateCandidateRequest
} from '../clan-workspace.types';

import { AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { toJsonValue } from '../../../common/lib';
import { isUniqueViolation, PrismaService } from '../../../core';
import { CLAN_WORKSPACE } from '../config/workspace.constants';
import { toCandidateView } from '../mappers/candidate.mappers';
import { ClanAccessService } from './clan-access.service';

@Injectable()
export class RecruitFunnelWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClanAccessService
  ) {}

  async list({ clanId, userId, status }: ListCandidatesRequest): Promise<CandidateView[]> {
    await this.access.officer({ clanId, userId });

    const rows = await this.prisma.recruitCandidate.findMany({
      where: { clanId: BigInt(clanId), ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: CLAN_WORKSPACE.maxCandidates
    });

    return rows.map(toCandidateView);
  }

  async add({ clanId, userId, accountId, notes }: CreateCandidateRequest): Promise<CandidateView> {
    await this.access.officer({ clanId, userId });

    try {
      const candidate = await this.prisma.recruitCandidate.create({
        data: {
          clanId: BigInt(clanId),
          accountId: BigInt(accountId),
          notes: notes ?? null,
          createdByUserId: userId,
          statsSnapshot: toJsonValue(await this.snapshot(BigInt(accountId)))
        }
      });

      return toCandidateView(candidate);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('CONFLICT', 'The player is already in the funnel');
      }

      throw error;
    }
  }

  async update({ clanId, userId, id, status, notes, refreshStats }: UpdateCandidateRequest): Promise<CandidateView> {
    await this.access.officer({ clanId, userId });

    const candidate = await this.find({ clanId, userId, id });
    const updated = await this.prisma.recruitCandidate.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes === undefined ? {} : { notes }),
        ...(refreshStats ? { statsSnapshot: toJsonValue(await this.snapshot(candidate.accountId)) } : {})
      }
    });

    return toCandidateView(updated);
  }

  async remove({ clanId, userId, id }: ClanItemScope): Promise<void> {
    await this.access.officer({ clanId, userId });
    await this.find({ clanId, userId, id });
    await this.prisma.recruitCandidate.delete({ where: { id } });
  }

  private async find({ clanId, id }: ClanItemScope) {
    const candidate = await this.prisma.recruitCandidate.findFirst({ where: { id, clanId: BigInt(clanId) } });

    if (!candidate) {
      throw new AppNotFoundException('NOT_FOUND', `No candidate ${id}`);
    }

    return candidate;
  }

  private async snapshot(accountId: bigint): Promise<CandidateStats> {
    const [player, rating] = await Promise.all([
      this.prisma.player.findUnique({ where: { accountId }, select: { nickname: true } }),
      this.prisma.accountRating.findUnique({ where: { accountId_period: { accountId, period: 'overall' } } })
    ]);

    return {
      nickname: player?.nickname ?? null,
      battles: rating?.battles ?? null,
      wn8: rating?.wn8 ?? null,
      winRate: rating?.winRate ?? null,
      avgDamage: rating?.avgDamage ?? null,
      capturedAt: new Date().toISOString()
    };
  }
}
