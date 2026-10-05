import type { useProfiles } from './use-profiles';

export type ProfileRowModel = ReturnType<typeof useProfiles>['rows'][number];
