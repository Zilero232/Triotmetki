import type { ArmorLabels, ArmorTankRow } from '../../../lib/armor-protocol';

export type ViewerHeaderProps = { labels: ArmorLabels; tank: ArmorTankRow | null; onClose: () => void };
