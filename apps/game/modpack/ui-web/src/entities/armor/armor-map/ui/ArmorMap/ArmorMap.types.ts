import type { ArmorDrawReport } from '../../model/hooks';
import type { ArmorMapData } from '../../model/schemas';

export type ArmorMapProps = { data: ArmorMapData | null; onDrawn?: (report: ArmorDrawReport) => void };
