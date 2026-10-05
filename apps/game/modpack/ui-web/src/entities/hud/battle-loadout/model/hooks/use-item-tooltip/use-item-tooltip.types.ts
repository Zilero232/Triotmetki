import type { EquipmentItem } from '../../schemas';
import type { HoveredItemHandlers } from '../use-hovered-item';

export type ItemTooltip = { tip: EquipmentItem | undefined; handlers: (index: number) => HoveredItemHandlers };
