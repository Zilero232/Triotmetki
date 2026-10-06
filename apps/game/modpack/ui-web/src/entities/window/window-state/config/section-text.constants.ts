import type { StringKey } from '@/shared/i18n';

import type { SECTION } from './section.constants';

export const SECTION_TEXT: Record<(typeof SECTION)[keyof typeof SECTION], { title: StringKey; hint: StringKey }> = {
  battle: { title: 'sectionBattle', hint: 'sectionBattleHint' },
  hangar: { title: 'sectionHangar', hint: 'sectionHangarHint' },
  replays: { title: 'sectionReplays', hint: 'sectionReplaysHint' },
  data: { title: 'sectionData', hint: 'sectionDataHint' },
  profiles: { title: 'sectionProfiles', hint: 'profilesHint' },
  hud: { title: 'sectionHud', hint: 'hudHint' }
};
