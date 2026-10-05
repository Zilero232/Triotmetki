import { sumBy } from 'remeda';

import type { FieldOf } from '@/shared/api/protocol';

import { CHOICE_LAYOUT } from '../../config';

type Choices = FieldOf<'choice'>['choices'];

const fitsRow = (choices: Choices): boolean => sumBy(choices, ({ label }) => label.length) <= CHOICE_LAYOUT.maxSegmentChars;

const isCompact = (choices: Choices): boolean =>
  choices.length <= CHOICE_LAYOUT.maxCompactSegments && choices.every(({ label }) => label.length <= CHOICE_LAYOUT.compactLabelChars);

export const choiceLayout = (choices: Choices): 'list' | 'segmented' =>
  fitsRow(choices) && (choices.length <= CHOICE_LAYOUT.maxSegments || isCompact(choices)) ? 'segmented' : 'list';
