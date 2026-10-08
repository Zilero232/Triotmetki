import type { ArmorState } from '../../../../../lib/armor-protocol';

export type AttackerPickerProps = { state: ArmorState; onPick: (cd: number) => void };
