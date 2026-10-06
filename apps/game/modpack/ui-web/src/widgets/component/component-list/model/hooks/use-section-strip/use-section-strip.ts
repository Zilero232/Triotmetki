import { useStore } from '@nanostores/react';

import { $components, componentsOf } from '@/entities/window/window-state';

import type { UseSectionStripInput } from './use-section-strip.types';

export const useSectionStrip = ({ section }: UseSectionStripInput) => componentsOf({ components: useStore($components), section });
