import type { FinalStats } from '@otmetki/gamedata';
import type { LoadoutResult } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { calculateLoadout } from '@otmetki/gamedata';
import { isNonNullish } from 'remeda';

import type { CalculateLoadoutInput } from '../builds.types';

import { AppBadRequestException } from '../../../common/exceptions';
import { toVehicleStats } from '../../reference';
import { assembleLoadout } from '../lib/assemble-loadout/assemble-loadout';
import { BuildDataService } from './build-data.service';

@Injectable()
export class LoadoutReaderService {
  constructor(private readonly data: BuildDataService) {}

  async calculate({ tankId, request }: CalculateLoadoutInput): Promise<LoadoutResult> {
    const { loadout } = request;
    const ids = [...loadout.equipment, ...loadout.consumables, ...loadout.directives].filter(isNonNullish);

    const [vehicle, byId, compatible, skills] = await Promise.all([
      this.data.vehicle(tankId),
      this.data.provisionsByIds(ids),
      loadout.fieldModifications.length > 0 ? this.data.provisions(tankId) : Promise.resolve([]),
      this.data.crewSkills()
    ]);

    const assembled = assembleLoadout({
      tankId,
      vehicle,
      request,
      provisions: [...byId, ...compatible.filter((row) => row.type === 'fieldModification')],
      skills
    });

    const stats = this.run(() => calculateLoadout(assembled.input));

    return {
      tankId,
      profileId: assembled.profileId,
      stats: toVehicleStats(stats),
      crew: { crewLevelIncrease: stats.crew.crewLevelIncrease, levels: stats.crew.levels },
      ignored: assembled.ignored
    };
  }

  private run(calculate: () => FinalStats): FinalStats {
    try {
      return calculate();
    } catch (error) {
      throw new AppBadRequestException('VALIDATION_FAILED', error instanceof Error ? error.message : 'The loadout cannot be calculated');
    }
  }
}
