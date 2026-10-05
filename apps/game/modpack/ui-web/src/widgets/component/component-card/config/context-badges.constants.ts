import type { UiContext } from '@/shared/api/protocol';
import type { StringKey } from '@/shared/i18n';
import type { UiIconName } from '@/shared/lib/icon-sprite';

const HANGAR = { key: 'contextHangar', icon: 'warehouse' } as const;
const BATTLE = { key: 'contextBattle', icon: 'crosshair' } as const;

export const CONTEXT_BADGES: Record<UiContext, readonly { key: StringKey; icon: UiIconName }[]> = {
  hangar: [HANGAR],
  battle: [BATTLE],
  any: [HANGAR, BATTLE]
};
