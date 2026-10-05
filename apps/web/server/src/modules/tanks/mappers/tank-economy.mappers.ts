import type { TankEconomy, TankEconomyFigures } from '@otmetki/schemas';

import { TANK_ECONOMY } from '@otmetki/schemas';
import { firstBy } from 'remeda';

import type { TankEconomyAggregate } from '../../../../generated';
import type { ToTankEconomyInput } from './tank-economy.types';

const toFigures = (row: TankEconomyAggregate | undefined): TankEconomyFigures | null =>
  row
    ? {
        battles: row.battles,
        players: row.players,
        costBattles: row.costBattles,
        credits: row.credits,
        creditsBase: row.creditsBase,
        repair: row.repair,
        ammo: row.ammo,
        consumables: row.consumables,
        net: row.net,
        xp: row.xp,
        freeXp: row.freeXp
      }
    : null;

export const toTankEconomy = ({ tankId, rows }: ToTankEconomyInput): TankEconomy => {
  const latest = firstBy(rows, [(row) => row.computedAt.getTime(), 'desc']);

  return {
    tankId,
    windowDays: latest?.windowDays ?? TANK_ECONOMY.windowDays,
    all: toFigures(rows.find((row) => row.account === 'all')),
    premium: toFigures(rows.find((row) => row.account === 'premium')),
    standard: toFigures(rows.find((row) => row.account === 'standard')),
    computedAt: latest ? latest.computedAt.toISOString() : null
  };
};
