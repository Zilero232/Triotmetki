import type { ArmorTankRow } from '../../../../../lib/armor-protocol';

export type TankEntryProps = { row: ArmorTankRow; onPick: (cd: number) => void };
