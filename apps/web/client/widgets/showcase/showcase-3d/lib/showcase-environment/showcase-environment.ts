import { isbot } from 'isbot';

import type { ShowcaseEnvironment } from '../showcase-mode';

type NavigatorHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

let webglSupport: boolean | undefined;

const detectWebgl = (): boolean => {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement('canvas');

      webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
      webglSupport = false;
    }
  }

  return webglSupport;
};

export const readShowcaseEnvironment = (): Omit<ShowcaseEnvironment, 'prefersReducedMotion'> => {
  const hints: NavigatorHints = navigator;

  return {
    hasWebgl: detectWebgl(),
    isCrawler: isbot(navigator.userAgent),
    saveData: hints.connection?.saveData ?? false,
    isCoarsePointer: window.matchMedia('(pointer: coarse)').matches,
    cores: hints.hardwareConcurrency,
    memoryGb: hints.deviceMemory
  };
};
