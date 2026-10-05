import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { readFile } from 'node:fs/promises';

import type { SignatureFont } from '../lib/signature/signature.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { insensitiveEquals } from '../../../common/lib';
import { PrismaService, REDIS } from '../../../core';
import { SIGNATURE } from '../config/signature.constants';
import { renderSignature } from '../lib/signature/signature';

@Injectable()
export class SignatureReaderService {
  private fonts: Promise<SignatureFont[]> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async png(nickname: string): Promise<Buffer> {
    const key = `${SIGNATURE.cachePrefix}${nickname.toLowerCase()}`;
    const cached = await this.redis.getBuffer(key);

    if (cached) {
      return cached;
    }

    const player = await this.prisma.player.findFirst({
      where: { nickname: insensitiveEquals(nickname), isHidden: false },
      select: { accountId: true, nickname: true, clanId: true }
    });

    if (!player) {
      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player ${nickname}`);
    }

    const [rating, clan] = await Promise.all([
      this.prisma.accountRating.findUnique({ where: { accountId_period: { accountId: player.accountId, period: 'overall' } } }),
      player.clanId === null ? null : this.prisma.clan.findUnique({ where: { clanId: player.clanId }, select: { tag: true } })
    ]);

    const png = await renderSignature({
      data: {
        nickname: player.nickname,
        clanTag: clan?.tag ?? null,
        battles: rating?.battles ?? null,
        winRate: rating ? rating.winRate / 100 : null,
        wn8: rating?.wn8 ?? null,
        avgDamage: rating?.avgDamage ?? null
      },
      fonts: await this.loadFonts()
    });

    await this.redis.set(key, png, 'EX', SIGNATURE.cacheSeconds);

    return png;
  }

  private loadFonts(): Promise<SignatureFont[]> {
    this.fonts ??= Promise.all([
      readFile(new URL(`../assets/fonts/${SIGNATURE.fontFiles.display}`, import.meta.url)),
      readFile(new URL(`../assets/fonts/${SIGNATURE.fontFiles.body}`, import.meta.url))
    ]).then(([display, body]) => [
      { name: SIGNATURE.fontNames.display, data: display, weight: 700, style: 'normal' },
      { name: SIGNATURE.fontNames.body, data: body, weight: 500, style: 'normal' }
    ]);

    return this.fonts;
  }
}
