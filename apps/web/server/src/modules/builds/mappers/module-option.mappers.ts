import type { ModuleBase } from '@otmetki/gamedata';
import type { ModuleOption } from '@otmetki/schemas';

export const toModuleOption = (module: ModuleBase): ModuleOption => ({
  moduleId: module.moduleId,
  name: module.name,
  displayName: module.displayName,
  tier: module.tier ?? null
});
