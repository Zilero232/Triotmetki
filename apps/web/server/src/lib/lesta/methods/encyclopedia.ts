import { z } from 'zod';

import type { FieldList, LestaCallOptions, LestaRequester, LestaResponse, Selected } from '../client/client.types';
import type { EncyclopediaInfo, Vehicle, VehicleProfile } from '../schemas/encyclopedia/encyclopedia.types';
import type { VehicleProfileInput, VehicleProfilesInput, VehiclesInput } from './methods.types';

import { LESTA_API } from '../client/client.constants';
import { callParams, fieldAwareSchema } from '../client/params/params';
import { idMapOf } from '../schemas/common/common.schemas';
import { encyclopediaInfoSchema, vehicleProfileSchema, vehicleSchema } from '../schemas/encyclopedia/encyclopedia.schemas';
import { batchedMap, passthrough, passthroughById } from './call-shapes/call-shapes';

export const createEncyclopediaMethods = (requester: LestaRequester) => {
  const vehicles = async <const F extends FieldList | undefined = undefined>({
    tankIds,
    nations,
    types,
    tiers,
    pageNo,
    limit,
    fields,
    ...options
  }: VehiclesInput<F>): Promise<LestaResponse<Record<string, Selected<F, Vehicle> | null>>> => {
    const params = { ...callParams({ ...options, fields }), nation: nations, type: types, tier: tiers, page_no: pageNo, limit };
    const schema = idMapOf(fieldAwareSchema({ schema: vehicleSchema, fields }));

    if (tankIds && tankIds.length > 0) {
      const data = await batchedMap({ requester, method: 'encyclopedia/vehicles', idParam: 'tank_id', ids: tankIds, params, schema });

      return { data, meta: { count: Object.keys(data).length } };
    }

    return requester.call({ method: 'encyclopedia/vehicles', params, schema });
  };

  const allVehicles = async <const F extends FieldList | undefined = undefined>(
    input: Omit<VehiclesInput<F>, 'pageNo' | 'tankIds'> = {}
  ): Promise<Record<string, Selected<F, Vehicle> | null>> => {
    const collected: Record<string, Selected<F, Vehicle> | null> = {};
    let pageNo = 1;
    let pageTotal = 1;

    while (pageNo <= pageTotal) {
      const { data, meta } = await vehicles({ ...input, pageNo, limit: input.limit ?? LESTA_API.batchSize });

      Object.assign(collected, data);
      pageTotal = meta.page_total ?? 1;
      pageNo += 1;
    }

    return collected;
  };

  const vehicleprofile = async <const F extends FieldList | undefined = undefined>({
    tankId,
    profileId,
    modules,
    fields,
    ...options
  }: VehicleProfileInput<F>): Promise<Selected<F, VehicleProfile> | null> => {
    const { data } = await requester.call({
      method: 'encyclopedia/vehicleprofile',
      params: {
        ...callParams({ ...options, fields }),
        tank_id: tankId,
        profile_id: profileId,
        engine_id: modules?.engineId,
        gun_id: modules?.gunId,
        radio_id: modules?.radioId,
        suspension_id: modules?.suspensionId,
        turret_id: modules?.turretId
      },
      schema: idMapOf(fieldAwareSchema({ schema: vehicleProfileSchema, fields }))
    });

    return data[String(tankId)] ?? null;
  };

  const vehicleprofiles = async <const F extends FieldList | undefined = undefined>({
    tankIds,
    orderBy,
    fields,
    ...options
  }: VehicleProfilesInput<F>): Promise<Record<string, Selected<F, VehicleProfile[]> | null>> =>
    batchedMap({
      requester,
      method: 'encyclopedia/vehicleprofiles',
      idParam: 'tank_id',
      ids: tankIds,
      params: { ...callParams({ ...options, fields }), order_by: orderBy },
      schema: idMapOf(fieldAwareSchema({ schema: z.array(vehicleProfileSchema), fields }))
    });

  const info = async (options: LestaCallOptions = {}): Promise<EncyclopediaInfo> => {
    const { data } = await requester.call({ method: 'encyclopedia/info', params: callParams(options), schema: encyclopediaInfoSchema });

    return data;
  };

  return {
    vehicles,
    allVehicles,
    vehicleprofile,
    vehicleprofiles,
    info,
    modules: passthroughById({ requester, method: 'encyclopedia/modules', idParam: 'module_id' }),
    achievements: passthrough({ requester, method: 'encyclopedia/achievements' }),
    arenas: passthrough({ requester, method: 'encyclopedia/arenas' }),
    provisions: passthroughById({ requester, method: 'encyclopedia/provisions', idParam: 'provision_id' }),
    personalmissions: passthrough({ requester, method: 'encyclopedia/personalmissions' }),
    boosters: passthroughById({ requester, method: 'encyclopedia/boosters', idParam: 'booster_id' }),
    badges: passthrough({ requester, method: 'encyclopedia/badges' }),
    crewroles: passthrough({ requester, method: 'encyclopedia/crewroles' }),
    crewskills: passthrough({ requester, method: 'encyclopedia/crewskills' })
  };
};
