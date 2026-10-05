import { uiSound } from '@/shared/api/gameface';

import type { SoundRoot } from './ui-sounds.types';

import { UI_SOUNDS } from './ui-sounds.constants';

const isControl = (element: HTMLElement): boolean => {
  const isButton = element.tagName === UI_SOUNDS.control;
  const isOutOfTabOrder = element.tabIndex < 0;

  return isButton && !isOutOfTabOrder;
};

const controlOf = (target: EventTarget | null): HTMLElement | null => {
  let element = target instanceof HTMLElement ? target : null;

  while (element !== null && !isControl(element)) {
    element = element.parentElement;
  }

  return element;
};

const isEnabled = (control: HTMLElement): boolean => Reflect.get(control, 'disabled') !== true;

export const bindUiSounds = (root: SoundRoot): (() => void) => {
  let hovered: HTMLElement | null = null;

  const onOver = (event: MouseEvent): void => {
    const control = controlOf(event.target);

    if (control === hovered) {
      return;
    }

    hovered = control;

    if (control !== null && isEnabled(control)) {
      uiSound.play('hover');
    }
  };

  const onClick = (event: MouseEvent): void => {
    const control = controlOf(event.target);

    if (control !== null && isEnabled(control)) {
      uiSound.play('click');
    }
  };

  root.addEventListener('mouseover', onOver);
  root.addEventListener('click', onClick);

  return () => {
    root.removeEventListener('mouseover', onOver);
    root.removeEventListener('click', onClick);
  };
};
