import { isDefined, pickBy } from 'remeda';

import type { ArenaRow, CreateImportPlanInput, LocalizeArenaInput, LocalizedArenaFields } from '../../importer.types';

import { slugify } from '../../../../../../common/lib';
import { translate } from '../../../localization/localization';
import { minimapUrl } from '../../../source/github/github';

const localizeArena = ({ arena, messages = {} }: LocalizeArenaInput): LocalizedArenaFields =>
  pickBy(
    {
      name: translate({ messages, key: arena.nameKey }),
      description: translate({ messages, key: arena.descriptionKey })
    },
    isDefined
  );

export const arenaLocalizationKeys = ({ arenas }: CreateImportPlanInput['data']): (string | undefined)[] =>
  arenas.flatMap((arena) => [arena.nameKey, arena.descriptionKey]);

export const buildArenaRows = ({ data, messages }: CreateImportPlanInput): ArenaRow[] =>
  data.arenas.map((arena) => {
    const localized = localizeArena({ arena, messages });

    return {
      arenaId: arena.arenaId,
      name: localized.name ?? arena.displayName,
      nameEn: arena.displayName,
      nameKey: arena.nameKey ?? null,
      description: localized.description ?? null,
      descriptionKey: arena.descriptionKey ?? null,
      localized,
      slug: slugify(arena.arenaId),
      camouflageType: arena.camouflageKind,
      sizeMeters: arena.sizeMeters,
      modes: arena.gameplayTypes,
      image: minimapUrl({ sourceId: data.revision.sourceId, path: arena.minimapImage }),
      data: { ...arena }
    };
  });
