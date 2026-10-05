import type { Playlist, PlaylistReason } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { PLAYLIST, PLAYLIST_REASONS, vehicleTypeSchema } from '@otmetki/schemas';
import { millisecondsInDay } from 'date-fns/constants';

import type { PlaylistInput } from '../analytics.types';

import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { MissionProgressService } from '../../missions';
import { PlayerMarksService } from '../../players';
import { VehicleCatalogService } from '../../reference';
import { buildPlaylist, dailyWindow } from '../lib';
import { toPlaylistCandidates, toPlaylistItems } from '../mappers/playlist.mappers';
import { FirstWinService } from './first-win.service';
import { OwnAccountService } from './own-account.service';

@Injectable()
export class PlaylistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly accounts: OwnAccountService,
    private readonly firstWin: FirstWinService,
    private readonly marks: PlayerMarksService,
    private readonly missions: MissionProgressService,
    private readonly entitlements: EntitlementsService
  ) {}

  async playlist({ userId, account, seed }: PlaylistInput): Promise<Playlist> {
    const now = new Date();
    const { resetAt } = dailyWindow(now);
    const isExtended = await this.entitlements.isPlus(userId);
    const size = isExtended ? PLAYLIST.plusSize : PLAYLIST.freeSize;
    const daySeed = seed ?? Math.floor(resetAt.getTime() / millisecondsInDay);
    const accountId = await this.accounts.find({ userId, account });
    const base = { isExtended, size, seed: daySeed };

    if (accountId === null) {
      return { accountId: null, state: 'noLink', ...base, items: [] };
    }

    const tanks = await this.prisma.playerTank.findMany({ where: { accountId, inGarage: true } });

    if (tanks.length === 0) {
      return { accountId: Number(accountId), state: 'noGarage', ...base, items: [] };
    }

    const [marks, taken, missionClasses, catalog] = await Promise.all([
      this.marks.marks(accountId),
      this.firstWin.taken({ accountId, since: resetAt }),
      isExtended ? this.missionClasses(userId) : Promise.resolve(new Set<string>()),
      this.catalog.all()
    ]);

    const markOf = new Map(marks.items.map((item) => [item.vehicle.tankId, item]));
    const candidates = toPlaylistCandidates({ tanks, catalog, markOf, taken, missionClasses, now });
    const reasons: readonly PlaylistReason[] = isExtended ? PLAYLIST_REASONS : PLAYLIST.freeReasons;
    const picks = buildPlaylist({ candidates, size, reasons, seed: daySeed });

    return { accountId: Number(accountId), state: 'ready', ...base, items: toPlaylistItems({ picks, catalog, markOf }) };
  }

  private async missionClasses(userId: string): Promise<Set<string>> {
    const next = await this.missions.next(userId);

    return new Set(next?.missions.flatMap((mission) => (vehicleTypeSchema.safeParse(mission.branchKey).success ? [mission.branchKey] : [])) ?? []);
  }
}
