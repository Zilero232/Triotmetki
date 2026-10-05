import type { PersonalMissionsData } from '../../parsers/personal-missions/personal-missions.types';
import type { BuildPersonalMissionsInput } from '../personal-missions.types';

import { parsePersonalMissions } from '../../parsers/personal-missions/personal-missions';
import { PERSONAL_MISSION_FILES } from '../../parsers/personal-missions/personal-missions.constants';
import { parsePoMessages } from '../../parsers/po/po';
import { GAME_PATHS } from '../../source/source.constants';

export const buildPersonalMissions = async ({ reader, localeReader }: BuildPersonalMissionsInput): Promise<PersonalMissionsData | undefined> => {
  const [seasonsXml, tilesXml, listXml, configPy, po] = await Promise.all([
    reader.read(`${GAME_PATHS.personalMissions}/${PERSONAL_MISSION_FILES.seasons}`),
    reader.read(`${GAME_PATHS.personalMissions}/${PERSONAL_MISSION_FILES.tiles}`),
    reader.read(`${GAME_PATHS.personalMissions}/${PERSONAL_MISSION_FILES.list}`),
    reader.read(PERSONAL_MISSION_FILES.config),
    localeReader?.read(PERSONAL_MISSION_FILES.localization)
  ]);

  if (!seasonsXml || !tilesXml || !listXml) {
    return undefined;
  }

  return parsePersonalMissions({ seasonsXml, tilesXml, listXml, configPy, messages: po ? parsePoMessages(po) : undefined });
};
