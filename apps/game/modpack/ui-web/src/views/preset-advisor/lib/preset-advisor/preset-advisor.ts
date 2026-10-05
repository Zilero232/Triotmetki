import { PRESET_ADVISOR, PRESET_ADVISOR_STYLE } from '../../config';
import { parseAdvicePayload } from '../advice-payload';
import { findAdvisorModels, payloadOf } from '../advisor-model';
import { markCards } from '../card-marks';
import { advisedImages } from '../setup-slots';

const addStyle = (document: Document): void => {
  if (document.getElementById(PRESET_ADVISOR.dom.styleId)) {
    return;
  }

  const style = document.createElement('style');

  style.id = PRESET_ADVISOR.dom.styleId;
  style.textContent = PRESET_ADVISOR_STYLE;
  document.head.appendChild(style);
};

export const applyMarks = (scope: Window): number => {
  const images: string[] = [];
  let label = '';

  for (const model of findAdvisorModels(scope)) {
    const payload = parseAdvicePayload(payloadOf(model));

    if (payload) {
      images.push(...advisedImages({ model, items: payload.items }));
      label = payload.label;
    }
  }

  return markCards({ root: scope.document.body, images, label });
};

export const startPresetAdvisor = (scope: Window & typeof globalThis): (() => void) => {
  let isScheduled = false;

  const run = (): void => {
    isScheduled = false;
    applyMarks(scope);
  };

  const schedule = (): void => {
    if (!isScheduled) {
      isScheduled = true;
      scope.requestAnimationFrame(run);
    }
  };

  addStyle(scope.document);

  const observer = new scope.MutationObserver(schedule);

  observer.observe(scope.document.body, { childList: true, subtree: true, attributes: true });

  const timer = scope.setInterval(schedule, PRESET_ADVISOR.refreshMs);

  run();

  return () => {
    observer.disconnect();
    scope.clearInterval(timer);
  };
};
