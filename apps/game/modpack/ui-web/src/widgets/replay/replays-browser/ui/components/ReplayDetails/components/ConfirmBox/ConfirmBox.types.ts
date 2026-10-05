import type { PendingKind } from '@/features/replay/manage-replay';

import type { DetailsActionProps } from '../../ReplayDetails.types';

export type ConfirmBoxProps = DetailsActionProps & { kind: PendingKind };
