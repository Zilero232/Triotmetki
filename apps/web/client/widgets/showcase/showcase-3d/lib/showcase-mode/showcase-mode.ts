import type { ShowcaseEnvironment, ShowcaseMode } from './showcase-mode.types';

import { LOW_POWER } from '../../config';

const isLowPower = ({ isCoarsePointer, cores, memoryGb }: ShowcaseEnvironment) =>
  isCoarsePointer && ((cores ?? LOW_POWER.maxCores) <= LOW_POWER.maxCores || (memoryGb ?? LOW_POWER.maxMemoryGb) <= LOW_POWER.maxMemoryGb);

export const resolveShowcaseMode = (environment: ShowcaseEnvironment): ShowcaseMode => {
  if (environment.isCrawler) {
    return 'flat';
  }

  if (!environment.hasWebgl || environment.saveData || isLowPower(environment)) {
    return 'flat';
  }

  return environment.prefersReducedMotion ? 'still' : 'live';
};
