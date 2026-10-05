import { DOM } from '@/shared/config';

export const onDomReady = (callback: () => void): void => {
  if (document.readyState !== DOM.loadingState) {
    callback();

    return;
  }

  const listener = (): void => {
    document.removeEventListener(DOM.readyEvent, listener);
    callback();
  };

  document.addEventListener(DOM.readyEvent, listener);
};
