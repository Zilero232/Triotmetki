import type { ArmorLegendData } from '@/entities/armor/armor-map';

import type { ArmorStatus } from '../../../lib/armor-protocol';

export type LegendPanelProps = { label: string; legend: ArmorLegendData; status: ArmorStatus | null };
