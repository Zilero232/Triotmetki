import type { AccountEconomy, AccountEconomySplit } from '@otmetki/schemas';

import { TANK_ECONOMY } from '@otmetki/schemas';
import { groupBy, meanBy, sumBy } from 'remeda';

import type { AccountEconomyInput, EconomyBattle } from './tank-economy.types';

import { ACCOUNT_ECONOMY } from '../../config/tank-economy.constants';

export const battleNet = (battle: EconomyBattle): number | null =>
  battle.repairCost === null || battle.ammoCost === null || battle.consumablesCost === null
    ? null
    : battle.credits - battle.repairCost - battle.ammoCost - battle.consumablesCost;

const averageNet = (battles: readonly EconomyBattle[]): number | null => {
  const nets = battles.flatMap((battle) => {
    const net = battleNet(battle);

    return net === null ? [] : [net];
  });

  return nets.length > 0 ? Math.round(meanBy(nets, (net) => net)) : null;
};

const toSplit = (battles: readonly EconomyBattle[]): AccountEconomySplit => ({
  battles: battles.length,
  credits: battles.length > 0 ? Math.round(meanBy(battles, (battle) => battle.credits)) : null,
  net: averageNet(battles)
});

const baseCredits = (battle: EconomyBattle): number => battle.creditsGross ?? battle.credits;

export const accountEconomy = ({ accountId, days, battles, vehicles }: AccountEconomyInput): AccountEconomy => {
  const premium = battles.filter((battle) => battle.isPremiumAccount === true);
  const standard = battles.filter((battle) => battle.isPremiumAccount !== true);
  const earned = sumBy(premium, (battle) => Math.max(0, battle.credits - baseCredits(battle)));
  const missed = Math.round(sumBy(standard, (battle) => baseCredits(battle) * ACCOUNT_ECONOMY.premiumBonus));
  const nets = battles.flatMap((battle) => {
    const net = battleNet(battle);

    return net === null ? [] : [net];
  });

  const tanks = Object.values(groupBy(battles, (battle) => battle.tankId))
    .flatMap((group) => {
      const vehicle = vehicles.get(group[0].tankId);

      return vehicle
        ? [
            {
              vehicle,
              battles: group.length,
              credits: Math.round(meanBy(group, (battle) => battle.credits)),
              net: averageNet(group),
              xp: Math.round(meanBy(group, (battle) => battle.xp))
            }
          ]
        : [];
    })
    .sort((a, b) => b.battles - a.battles)
    .slice(0, TANK_ECONOMY.accountTanksLimit);

  return {
    accountId,
    days,
    battles: battles.length,
    totalCredits: sumBy(battles, (battle) => battle.credits),
    totalNet: nets.length > 0 ? sumBy(nets, (net) => net) : null,
    premium: toSplit(premium),
    standard: toSplit(standard),
    premiumBonus: {
      earned,
      missed,
      perBattle: battles.length > 0 ? Math.round((earned + missed) / battles.length) : null
    },
    tanks
  };
};
