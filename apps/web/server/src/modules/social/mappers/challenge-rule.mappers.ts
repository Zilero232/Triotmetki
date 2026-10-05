import type { ChallengeDefinition } from '../lib/challenges/challenges.types';
import type { ChallengeRuleView } from '../social.types';

import { VEHICLE_TYPE_FROM_DB } from '../../../common/lib';

export const toChallengeRule = (definition: ChallengeDefinition): ChallengeRuleView => ({
  code: definition.code,
  metric: definition.metric,
  target: definition.target,
  threshold: 'threshold' in definition ? definition.threshold : null,
  vehicleType: 'vehicleType' in definition ? VEHICLE_TYPE_FROM_DB[definition.vehicleType] : null
});
