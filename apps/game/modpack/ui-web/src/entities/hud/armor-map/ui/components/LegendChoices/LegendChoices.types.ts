import type { ArmorLegendData } from '../../../model/schemas';

export type LegendChoicesProps = Pick<ArmorLegendData, 'attacker' | 'modes' | 'shells'>;
