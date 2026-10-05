import { z } from 'zod';

const count = z.number().nullish();
const flag = z.union([z.boolean(), z.number()]).nullish();

const arenaVehicleSchema = z.looseObject({
  name: z.string().nullish(),
  fakeName: z.string().nullish(),
  vehicleType: z.string().nullish(),
  team: z.number(),
  clanAbbrev: z.string().nullish(),
  isAlive: flag,
  isTeamKiller: flag,
  maxHealth: count,
  accountDBID: count
});

export const arenaBlockSchema = z.looseObject({
  clientVersionFromXml: z.string().nullish(),
  clientVersionFromExe: z.string().nullish(),
  mapName: z.string().nullish(),
  mapDisplayName: z.string().nullish(),
  gameplayID: z.string().nullish(),
  battleType: count,
  dateTime: z.string().nullish(),
  playerID: count,
  playerName: z.string().nullish(),
  playerVehicle: z.string().nullish(),
  serverName: z.string().nullish(),
  regionCode: z.string().nullish(),
  hasMods: z.boolean().nullish(),
  vehicles: z.record(z.string(), arenaVehicleSchema).default({})
});

export const vehicleResultSchema = z.looseObject({
  accountDBID: count,
  typeCompDescr: count,
  team: count,
  maxHealth: count,
  health: count,
  deathReason: count,
  killerID: count,
  damageDealt: count,
  damageAssistedRadio: count,
  damageAssistedTrack: count,
  damageAssistedStun: count,
  damageBlockedByArmor: count,
  damageReceived: count,
  spotted: count,
  kills: count,
  tkills: count,
  xp: count,
  credits: count,
  shots: count,
  directEnemyHits: count,
  directHits: count,
  piercings: count,
  capturePoints: count,
  droppedCapturePoints: count,
  lifeTime: count,
  mileage: count
});

export const personalResultSchema = vehicleResultSchema.extend({
  originalXP: count,
  originalCredits: count,
  freeXP: count,
  markOfMastery: count
});

const battleResultSchema = z.looseObject({
  arenaUniqueID: z.union([z.string(), z.number()]).nullish(),
  common: z
    .looseObject({
      arenaCreateTime: count,
      arenaTypeID: count,
      bonusType: count,
      duration: count,
      finishReason: count,
      winnerTeam: count
    })
    .nullish(),
  personal: z.record(z.string(), z.unknown()).nullish(),
  players: z
    .record(
      z.string(),
      z.looseObject({
        name: z.string().nullish(),
        realName: z.string().nullish(),
        clanAbbrev: z.string().nullish(),
        team: count
      })
    )
    .nullish(),
  vehicles: z.record(z.string(), z.array(vehicleResultSchema)).nullish()
});

export const resultsBlockSchema = z
  .tuple(
    [
      battleResultSchema,
      z.record(z.string(), arenaVehicleSchema.partial()).nullish().catch(null),
      z
        .record(z.string(), z.looseObject({ frags: count }))
        .nullish()
        .catch(null)
    ],
    z.unknown()
  )
  .transform(([results, extended, frags]) => ({ results, extended: extended ?? null, frags: frags ?? null }));
