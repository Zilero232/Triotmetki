import type { ArmorMode } from '@/entities/armor/armor-map';

import type { ArmorState } from '../../../lib/armor-protocol';

export type ModeTabsProps = { modes: ArmorState['modes']; label: string; onSelect: (mode: ArmorMode) => void };
