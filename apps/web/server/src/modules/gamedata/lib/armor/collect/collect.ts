import type { VehicleSpec } from '@otmetki/gamedata';

import { gzipSync } from 'node:zlib';

import type { CollectArmorModelsInput, CollectedArmorModels, VehicleOutcome } from './collect.types';

import { errorMessage } from '../../../../../common/lib';
import { parseCollision, parseModelIndex } from '../../parsers/collision/collision';
import { assertMtClient } from '../../source/mt-client/mt-client';
import { MT_CLIENT } from '../../source/mt-client/mt-client.constants';
import { GAME_DATA_SOURCES, MODEL_PATHS, MODEL_SOURCES } from '../../source/source.constants';
import { joinArmorModel } from '../join/join';
import { packArmorGeometry } from '../pack/pack';
import { ARMOR_PACK } from '../pack/pack.constants';
import { ArmorVersionMismatchError } from './collect.errors';

export const collectArmorModels = async ({ data, reader, onProgress }: CollectArmorModelsInput): Promise<CollectedArmorModels> => {
  if (GAME_DATA_SOURCES[data.revision.sourceId].isTest) {
    throw new ArmorVersionMismatchError('Armor models are never imported for a test-server source');
  }

  const [rawVersion, readme] = await Promise.all([reader.read(MODEL_PATHS.version), reader.read(MT_CLIENT.readme)]);
  const label = `${reader.revision.owner}/${reader.revision.repo}@${reader.revision.sha}`;
  const version = assertMtClient({ label, version: rawVersion?.trim(), guid: MODEL_SOURCES.RU.guid, readme });

  if (version !== data.version) {
    throw new ArmorVersionMismatchError(`Armor mirror is at ${version ?? 'unknown'}, game data is at ${data.version ?? 'unknown'}`);
  }

  const indexJson = await reader.read(MODEL_PATHS.index);

  if (indexJson === undefined) {
    throw new Error(`${MODEL_PATHS.index} is missing from ${reader.revision.owner}/${reader.revision.repo}@${reader.revision.sha}`);
  }

  const index = parseModelIndex(indexJson);
  const shellNames = new Map(data.shells.map((shell) => [shell.shellId, shell.displayName]));

  const buildOne = async (spec: VehicleSpec): Promise<VehicleOutcome> => {
    const folder = index[spec.tag];

    if (!folder) {
      return { skipped: { tag: spec.tag, reason: `not in ${MODEL_PATHS.index}` }, mismatches: [] };
    }

    const path = `${MODEL_PATHS.vehicles}/${folder}/${MODEL_PATHS.collision}`;
    const json = await reader.read(path);

    if (json === undefined) {
      return { skipped: { tag: spec.tag, reason: `${path} is missing` }, mismatches: [] };
    }

    try {
      const { geometry, modules, mismatches } = joinArmorModel({ spec, collision: parseCollision(json), shellNames });
      const { bytes, hash } = packArmorGeometry(geometry);
      const gzipped = gzipSync(bytes).byteLength;
      const budget =
        gzipped > ARMOR_PACK.gzipBudgetBytes ? [`${spec.tag}: ${gzipped} B gzipped is over the ${ARMOR_PACK.gzipBudgetBytes} B budget`] : [];

      return { model: { tankId: spec.tankId, tag: spec.tag, bytes, hash, modules }, mismatches: [...mismatches, ...budget] };
    } catch (error) {
      return { skipped: { tag: spec.tag, reason: errorMessage(error) }, mismatches: [`${spec.tag}: ${errorMessage(error)}`] };
    }
  };

  onProgress?.(`Armor mirror ${label} (${MT_CLIENT.product} ${version})`);

  const outcomes = await Promise.all(data.vehicles.map(buildOne));

  return {
    version,
    sourceSha: reader.revision.sha,
    models: outcomes.flatMap(({ model }) => (model ? [model] : [])),
    skipped: outcomes.flatMap(({ skipped }) => (skipped ? [skipped] : [])),
    mismatches: outcomes.flatMap(({ mismatches }) => mismatches)
  };
};
