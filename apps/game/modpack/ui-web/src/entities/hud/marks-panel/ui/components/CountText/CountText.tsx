import { TabularText } from '@/ui-kit';

import type { CountTextProps } from './CountText.types';

import { useCountText } from '../../../model/hooks';

export const CountText = ({ value, className }: CountTextProps) => <TabularText className={className} text={useCountText(value)} />;
