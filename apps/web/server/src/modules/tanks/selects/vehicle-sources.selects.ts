import type { Prisma } from '../../../../generated';

export const VEHICLE_SOURCE_EVENT = {
  select: { slug: true, title: true, url: true, startsAt: true, endsAt: true }
} as const satisfies Prisma.VehicleSource$eventArgs;
