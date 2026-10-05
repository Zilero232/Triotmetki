// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GAMEFACE } from '@/shared/api/gameface';

import { bindUiSounds } from '../ui-sounds';

let played: unknown[][];
let unbind: () => void;

const button = (attributes: Record<string, string> = {}): HTMLButtonElement => {
  const element = document.createElement('button');
  const label = document.createElement('span');

  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  element.append(label);
  document.body.append(element);

  return element;
};

const hover = (target: Element): void => {
  target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
};

beforeEach(() => {
  played = [];
  Reflect.set(globalThis, GAMEFACE.globals.engine, { [GAMEFACE.engine.call]: (...args: unknown[]) => played.push(args) });
  unbind = bindUiSounds(document);
});

afterEach(() => {
  unbind();
  document.body.replaceChildren();
  Reflect.deleteProperty(globalThis, GAMEFACE.globals.engine);
});

describe(bindUiSounds, () => {
  it('plays the client click sound for a click on a button', () => {
    const control = button();

    control.firstElementChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(played).toEqual([[GAMEFACE.sound.event, GAMEFACE.sound.names.click]]);
  });

  it('plays the hover sound once while the pointer moves inside one button', () => {
    const control = button();

    hover(control);
    hover(control.firstElementChild ?? control);

    expect(played).toEqual([[GAMEFACE.sound.event, GAMEFACE.sound.names.hover]]);
  });

  it('stays silent over a disabled button', () => {
    const control = button({ disabled: '' });

    hover(control);

    expect(played).toEqual([]);
  });

  it('stays silent over a backdrop kept out of the tab order', () => {
    const backdrop = button({ tabindex: '-1' });

    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(played).toEqual([]);
  });
});
