import type { VehicleResult } from '../header/header.types';
import type { BuildSummaryInput, OutcomeOfInput, ReplayPlayer, ReplaySummary, WithPersonalInput } from './summary.types';

import {
  blankToNull,
  detectGame,
  findPersonalResult,
  masteryOf,
  parseClientVersion,
  parseDateTime,
  toPlayerResult,
  unixToIso
} from './summary.fields';
import { replaySummarySchema } from './summary.schemas';

const withPersonal = ({ result, personal }: WithPersonalInput) => {
  if (!result || !personal) {
    return result;
  }

  return {
    ...result,
    xp: personal.xp ?? result.xp,
    credits: personal.credits ?? result.credits
  };
};

const outcomeOf = ({ winnerTeam, team }: OutcomeOfInput): ReplaySummary['outcome'] => {
  if (winnerTeam === null || team === null) {
    return null;
  }

  if (winnerTeam === 0) {
    return 'draw';
  }

  return winnerTeam === team ? 'win' : 'loss';
};

export const buildSummary = ({ arena, results }: BuildSummaryInput): ReplaySummary => {
  const battle = results?.results ?? null;
  const common = battle?.common ?? null;
  const personal = findPersonalResult(battle?.personal);
  const resultVehicles: Record<string, VehicleResult[]> = battle?.vehicles ?? {};
  const recorderName = blankToNull(arena.playerName);
  const recorderAccountId = arena.playerID ?? personal?.accountDBID ?? null;

  const recorderEntry = Object.entries(arena.vehicles).find(([vehicleId, vehicle]) => {
    const accountId = vehicle.accountDBID ?? resultVehicles[vehicleId]?.[0]?.accountDBID;

    if (recorderAccountId !== null && accountId === recorderAccountId) {
      return true;
    }

    return recorderName !== null && vehicle.name === recorderName;
  });

  const recorderVehicleId = recorderEntry ? Number(recorderEntry[0]) : null;

  const players = Object.entries(arena.vehicles).map(([vehicleKey, vehicle]): ReplayPlayer => {
    const vehicleId = Number(vehicleKey);
    const entries = resultVehicles[vehicleKey] ?? [];
    const [firstEntry] = entries;
    const accountId = vehicle.accountDBID ?? firstEntry?.accountDBID ?? null;
    const account = accountId === null ? undefined : battle?.players?.[String(accountId)];
    const isRecorder = vehicleId === recorderVehicleId;
    const result = toPlayerResult(entries);

    return {
      vehicleId,
      accountId,
      name: vehicle.name ?? account?.name ?? vehicle.fakeName ?? '',
      clanTag: blankToNull(vehicle.clanAbbrev ?? account?.clanAbbrev),
      team: vehicle.team,
      vehicleType: blankToNull(vehicle.vehicleType),
      tankId: firstEntry?.typeCompDescr ?? null,
      maxHealth: firstEntry?.maxHealth ?? vehicle.maxHealth ?? null,
      isRecorder,
      result: isRecorder ? withPersonal({ result, personal }) : result
    };
  });

  players.sort((left, right) => left.team - right.team || left.vehicleId - right.vehicleId);

  const recorder = players.find((player) => player.isRecorder) ?? null;
  const winnerTeam = common?.winnerTeam ?? null;
  const recorderTeam = recorder?.team ?? personal?.team ?? null;
  const arenaUniqueId = battle?.arenaUniqueID;

  return replaySummarySchema.parse({
    game: detectGame(arena.clientVersionFromXml),
    clientVersion: parseClientVersion(arena),
    region: blankToNull(arena.regionCode),
    server: blankToNull(arena.serverName),
    map: {
      id: blankToNull(arena.mapName),
      name: blankToNull(arena.mapDisplayName),
      arenaTypeId: common?.arenaTypeID ?? null
    },
    mode: blankToNull(arena.gameplayID),
    battleType: arena.battleType ?? common?.bonusType ?? null,
    dateTime: blankToNull(arena.dateTime),
    startedAt: parseDateTime(arena.dateTime),
    arenaCreatedAt: unixToIso(common?.arenaCreateTime),
    durationSeconds: common?.duration ?? null,
    winnerTeam,
    finishReason: common?.finishReason ?? null,
    outcome: outcomeOf({ winnerTeam, team: recorderTeam }),
    arenaUniqueId: arenaUniqueId === null || arenaUniqueId === undefined ? null : String(arenaUniqueId),
    isComplete: battle !== null,
    hasMods: arena.hasMods ?? null,
    recorder: {
      accountId: recorderAccountId,
      name: recorderName ?? recorder?.name ?? null,
      vehicleId: recorderVehicleId,
      vehicleType: recorder?.vehicleType ?? blankToNull(arena.playerVehicle),
      team: recorderTeam,
      markOfMastery: masteryOf(personal?.markOfMastery)
    },
    players
  });
};
