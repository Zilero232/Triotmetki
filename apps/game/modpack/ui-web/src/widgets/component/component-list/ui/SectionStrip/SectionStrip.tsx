import type { SectionStripProps } from './SectionStrip.types';

import { useSectionStrip } from '../../model/hooks';
import { StripItem } from './components/StripItem';

export const SectionStrip = ({ section }: SectionStripProps) =>
  useSectionStrip({ section }).map((component) => <StripItem key={component.id} component={component} />);
