import type { XmlValue } from '../../xml/xml.types';
import type { Arena, ArenaGameplay, ArenaListEntry, MinimapImagePathInput, ParseArenaInput, Point } from './arenas.types';

import { entries, get, isXmlNode, list, localizationKey, nodes, num, nums, parseXml, text } from '../../xml/xml';
import { MINIMAP, NON_BATTLE_ARENA } from './arenas.constants';

const toPoint = (value: XmlValue | undefined): Point | undefined => {
  const [x, y] = nums(value);

  return x === undefined || y === undefined ? undefined : [x, y];
};

const toPoints = (values: XmlValue[]): Point[] => values.map((value) => toPoint(value)).filter((point): point is Point => point !== undefined);

const pointsByTeam = (value: XmlValue | undefined): Record<string, Point[]> => {
  const teams: Record<string, Point[]> = {};

  for (const [team, positions] of entries(value)) {
    teams[team] = toPoints(entries(positions).flatMap(([, point]) => list(point)));
  }

  return teams;
};

export const minimapImagePath = ({ minimap, arenaId }: MinimapImagePathInput): string => {
  const match = minimap ? MINIMAP.ddsPattern.exec(minimap) : null;
  const base = match?.[1] ?? arenaId;
  const suffix = match?.[2] ? `_${match[2]}` : '';

  return `${MINIMAP.directory}/${base}${suffix}${MINIMAP.extension}`;
};

export const parseArenaList = (xml: string): ArenaListEntry[] =>
  nodes(parseXml(xml).map).flatMap((item) => {
    const id = num(item.id);
    const name = text(item.name);

    return id === undefined || !name ? [] : [{ id, name }];
  });

export const arenaDisplayName = (arenaId: string): string =>
  arenaId
    .replace(/^\d+_/, '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const isBattleArena = (arenaId: string): boolean => !NON_BATTLE_ARENA.test(arenaId);

export const parseArena = ({ xml, arenaId, numericId }: ParseArenaInput): Arena | undefined => {
  const root = parseXml(xml);
  const bottomLeft = toPoint(get({ value: root, path: 'boundingBox/bottomLeft' }));
  const upperRight = toPoint(get({ value: root, path: 'boundingBox/upperRight' }));

  if (!bottomLeft || !upperRight) {
    return undefined;
  }

  const minimap = text(root.minimap);

  const gameplay: ArenaGameplay[] = entries(root.gameplayTypes).flatMap(([type, value]) => {
    if (!isXmlNode(value) && value !== '') {
      return [];
    }

    const section = isXmlNode(value) ? value : {};
    const modeMinimap = text(section.minimap);

    return [
      {
        type,
        minimap: modeMinimap,
        minimapImage: modeMinimap ? minimapImagePath({ minimap: modeMinimap, arenaId }) : undefined,
        teamBasePositions: pointsByTeam(section.teamBasePositions),
        teamSpawnPoints: pointsByTeam(section.teamSpawnPoints),
        controlPoints: toPoints(list(section.controlPoint))
      }
    ];
  });

  return {
    arenaId,
    numericId,
    nameKey: localizationKey(root.name),
    displayName: arenaDisplayName(arenaId),
    descriptionKey: localizationKey(root.description),
    geometry: text(root.geometry),
    boundingBox: { bottomLeft, upperRight },
    sizeMeters: Math.round(upperRight[0] - bottomLeft[0]),
    camouflageKind: text(root.vehicleCamouflageKind),
    maxPlayersInTeam: num(root.maxPlayersInTeam),
    roundLength: num(root.roundLength),
    minimap,
    minimapImage: minimapImagePath({ minimap, arenaId }),
    gameplayTypes: gameplay.map((item) => item.type),
    gameplay
  };
};
