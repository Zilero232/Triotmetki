import type { z } from 'zod';

import type { createVehicleSourceSchema, vehicleSourceKindSchema, vehicleSourceMissionSchema, vehicleSourceSchema } from './vehicle-sources.schemas';

export type VehicleSourceKind = z.infer<typeof vehicleSourceKindSchema>;
export type VehicleSourceMission = z.infer<typeof vehicleSourceMissionSchema>;
export type VehicleSource = z.infer<typeof vehicleSourceSchema>;
export type CreateVehicleSourceInput = z.infer<typeof createVehicleSourceSchema>;
