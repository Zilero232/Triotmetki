import { unique } from 'remeda';

import type {
  CreateImportPlanInput,
  DeviceRowInput,
  EquipmentRowInput,
  LocalizedProvisionFields,
  LocalizeProvisionInput,
  ModificationRowInput,
  ProvisionIconInput,
  ProvisionRow
} from '../../importer.types';

import { translate } from '../../../localization/localization';
import { resolveVehicleProgression } from '../../../parsers/post-progression/post-progression';
import { assetUrl } from '../../../source/github/github';
import { ASSET_PATHS } from '../../../source/source.constants';
import { PROVISION_ICON, PROVISION_TYPE } from '../../importer.constants';
import { compatibleTanks, prices } from '../vehicle-modules/vehicle-modules';

const localizeProvision = ({ messages, nameKey, descriptionKey }: LocalizeProvisionInput): LocalizedProvisionFields => {
  const name = translate({ messages, key: nameKey });
  const description = translate({ messages, key: descriptionKey });

  return { ...(name ? { name } : {}), ...(description ? { description } : {}) };
};

const provisionIcon = ({ sourceId, folder, icon }: ProvisionIconInput): string | undefined => {
  const name = icon?.trim().match(PROVISION_ICON.name)?.[1];

  return name ? assetUrl({ sourceId, path: `${folder}/${name}${ASSET_PATHS.extension}` }) : undefined;
};

const deviceRow = ({ device, vehicles, messages, sourceId }: DeviceRowInput): ProvisionRow => {
  const localized = localizeProvision({ messages, nameKey: device.nameKey, descriptionKey: device.descriptionKey });

  return {
    provisionId: device.provisionId,
    name: localized.name ?? device.displayName,
    tag: device.name,
    type: PROVISION_TYPE.optionalDevice,
    nameKey: device.nameKey,
    descriptionKey: device.descriptionKey,
    description: localized.description ?? undefined,
    image: provisionIcon({ sourceId, folder: ASSET_PATHS.artefact, icon: device.icon }),
    localized,
    ...prices(device.price),
    tankIds: compatibleTanks({ filter: device.vehicleFilter, vehicles }),
    data: { ...device }
  };
};

const equipmentRow = ({ item, vehicles, messages, sourceId }: EquipmentRowInput): ProvisionRow => {
  const localized = localizeProvision({ messages, nameKey: item.nameKey, descriptionKey: item.descriptionKey });

  return {
    provisionId: item.provisionId,
    name: localized.name ?? item.displayName,
    tag: item.name,
    type: item.kind === 'directive' ? PROVISION_TYPE.directive : PROVISION_TYPE.consumable,
    nameKey: item.nameKey,
    descriptionKey: item.descriptionKey,
    description: localized.description ?? undefined,
    image: provisionIcon({ sourceId, folder: ASSET_PATHS.artefact, icon: item.icon }),
    localized,
    ...prices(item.price),
    tankIds: compatibleTanks({ filter: item.vehicleFilter, vehicles }),
    data: { ...item }
  };
};

const modificationRow = ({ modification, tankIds, messages, sourceId }: ModificationRowInput): ProvisionRow => {
  const localized = localizeProvision({ messages, nameKey: modification.nameKey });

  return {
    provisionId: modification.provisionId,
    name: localized.name ?? modification.locName ?? modification.name,
    tag: modification.name,
    type: PROVISION_TYPE.fieldModification,
    nameKey: modification.nameKey,
    image: provisionIcon({ sourceId, folder: ASSET_PATHS.pairModification, icon: modification.imgName }),
    localized,
    tankIds,
    data: { ...modification }
  };
};

export const provisionLocalizationKeys = ({ optionalDevices, equipment, postProgression }: CreateImportPlanInput['data']): (string | undefined)[] => [
  ...optionalDevices.flatMap((device) => [device.nameKey, device.descriptionKey]),
  ...equipment.flatMap((item) => [item.nameKey, item.descriptionKey]),
  ...postProgression.modifications.map((modification) => modification.nameKey)
];

export const buildProvisionRows = ({ data, messages = {} }: CreateImportPlanInput): ProvisionRow[] => {
  const { vehicles, postProgression } = data;
  const sourceId = data.revision.sourceId;
  const tanksByModification = new Map<string, number[]>();

  for (const vehicle of vehicles) {
    for (const step of resolveVehicleProgression({
      progression: postProgression,
      treeName: vehicle.postProgressionTree,
      vehicleTier: vehicle.tier
    })) {
      for (const modification of [step.modification, ...(step.pair ?? [])]) {
        if (modification) {
          tanksByModification.set(modification.name, [...(tanksByModification.get(modification.name) ?? []), vehicle.tankId]);
        }
      }
    }
  }

  return [
    ...data.optionalDevices.map((device) => deviceRow({ device, vehicles, messages, sourceId })),
    ...data.equipment
      .filter((item) => item.kind === 'consumable' || item.kind === 'directive')
      .map((item) => equipmentRow({ item, vehicles, messages, sourceId })),
    ...postProgression.modifications.map((modification) =>
      modificationRow({ modification, tankIds: unique(tanksByModification.get(modification.name) ?? []), messages, sourceId })
    )
  ];
};
