// @vitest-environment jsdom
import type { RenderResult } from '@testing-library/react';

import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GAMEFACE } from '@/shared/api/gameface';
import { PointerScopeContext } from '@/shared/lib/pointer-scope';
import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { battleLoadoutSchema } from '../../model/schemas';
import { BattleLoadoutWidget } from '../BattleLoadoutWidget';

import s from '../BattleLoadoutWidget.module.scss';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

const data = battleLoadoutSchema.parse(readWidgetFixture('battle_loadout'));

const TOOLTIP_CONTENT_ID = 11;
const TOOLTIP_DECORATOR_ID = 12;

const tooltipResources = () => ({
  views: {
    common: {
      tooltip_window: {
        simple_tooltip_content: { SimpleTooltipContent: () => TOOLTIP_CONTENT_ID },
        tooltip_window: { TooltipWindow: () => TOOLTIP_DECORATOR_ID }
      }
    }
  }
});

const installClientTooltip = (): Record<string, unknown>[] => {
  const events: Record<string, unknown>[] = [];

  Reflect.set(globalThis, GAMEFACE.globals.resources, tooltipResources());
  Reflect.set(globalThis, GAMEFACE.globals.viewEnv, { [GAMEFACE.viewEvent.handle]: (event: Record<string, unknown>) => events.push(event) });

  return events;
};

afterEach(() => {
  Reflect.deleteProperty(globalThis, GAMEFACE.globals.resources);
  Reflect.deleteProperty(globalThis, GAMEFACE.globals.viewEnv);
});

const panel = (pointer: boolean, widget = data) => (
  <PointerScopeContext value={pointer}>
    <BattleLoadoutWidget data={widget} />
  </PointerScopeContext>
);

const drawn = new WeakMap<HTMLElement, RenderResult>();

const drawNew = (pointer: boolean, widget = data): HTMLElement => {
  const result = render(panel(pointer, widget));

  drawn.set(result.container, result);

  return result.container;
};

const draw = (container: HTMLElement, pointer: boolean, widget = data): HTMLElement => {
  drawn.get(container)?.rerender(panel(pointer, widget));

  return container;
};

const cellOf = (container: HTMLElement, name: string): HTMLElement | undefined => {
  const index = data.items.findIndex((item) => item.name === name);

  return container.querySelectorAll<HTMLElement>(`.${s.cell}`)[index];
};

const hover = (container: HTMLElement, event: 'mouseenter' | 'mouseleave'): void => {
  const cell = container.querySelectorAll<HTMLElement>(`.${s.cell}`)[1];

  if (cell) {
    (event === 'mouseenter' ? fireEvent.mouseEnter : fireEvent.mouseLeave)(cell);
  }
};

const spentAttention = () => {
  const [first, ...rest] = data.items;

  return { ...data, items: [{ ...first, attention: true, used: true }, ...rest] };
};

const withoutIcon = () => {
  const [first, ...rest] = data.items;

  return { ...data, items: [{ ...first, icon: 'otmetki:module' }, ...rest] };
};

const withEmptySlot = () => {
  const [first, ...rest] = data.items;

  return { ...data, items: [{ ...first, empty: true, name: '', effect: '', icon: null, overlay: null, bonus: false }, ...rest] };
};

describe(BattleLoadoutWidget, () => {
  it('draws every cell at the stock slot size in rem', () => {
    const container = drawNew(false);
    const cell = container.querySelector<HTMLElement>(`.${s.cell}`);

    expect(cell?.style.width).toBe(`${String(data.cell)}rem`);
    expect(cell?.style.height).toBe(`${String(data.cell)}rem`);
  });

  it('keeps a frame for an empty slot, so the row keeps its width', () => {
    const container = drawNew(false, withEmptySlot());
    const cells = container.querySelectorAll<HTMLElement>(`.${s.cell}`);

    expect(cells).toHaveLength(data.items.length);
    expect(cells[0]?.classList.contains(s.empty)).toBe(true);
    expect(cells[0]?.querySelector('img')).toBeNull();
  });

  it('draws the equipment and the directive as client icons with their overlays', () => {
    const container = drawNew(false);

    expect(sources(container)).toEqual([
      'img://gui/maps/icons/artefact/turbocharger.png',
      'img://gui/maps/icons/artefact/improvedVentilation.png',
      'img://gui/maps/icons/quests/bonuses/small/equipmentPlus_overlay.png',
      'img://gui/maps/icons/artefact/rammer.png',
      'img://gui/maps/icons/artefact/camouflageNet.png',
      'img://gui/maps/icons/artefact/rammer.png',
      'img://gui/maps/icons/artefact/battleBooster_overlay.png'
    ]);
  });

  it('draws one square cell per item and no text at all', () => {
    const container = drawNew(false);

    expect(container.querySelectorAll(`.${s.cell}`)).toHaveLength(data.items.length);
    expect(container.textContent).toBe('');
  });

  it('draws the specialisation stars', () => {
    const container = drawNew(false);

    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  it('draws our glyph when the client has no icon for a device', () => {
    const container = drawNew(false, withoutIcon());

    expect(cellOf(container, 'Турбонагнетатель')?.querySelector('img')).toBeNull();
    expect(cellOf(container, 'Турбонагнетатель')?.querySelectorAll('svg')).toHaveLength(2);
    expect(container.textContent).toBe('');
  });

  it('highlights the device the directive boosts and the device that is running', () => {
    const container = drawNew(false);

    expect(cellOf(container, 'Досылатель')?.classList.contains(s.boosted)).toBe(true);
    expect(cellOf(container, 'Маскировочная сеть')?.classList.contains(s.active)).toBe(true);
    expect(cellOf(container, 'Турбонагнетатель')?.classList.contains(s.active)).toBe(false);
  });

  it('marks a directive that does not affect the tank with a glyph, not a letter', () => {
    const container = drawNew(false, spentAttention());

    expect(cellOf(container, 'Турбонагнетатель')?.querySelector(`.${s.attention}`)).not.toBeNull();
    expect(container.textContent).toBe('');
  });

  it('dims a spent device', () => {
    const container = drawNew(false, spentAttention());

    expect(cellOf(container, 'Турбонагнетатель')?.classList.contains(s.used)).toBe(true);
  });

  it('explains the item under the pointer', () => {
    const container = drawNew(true);

    hover(container, 'mouseenter');

    expect(container.textContent).toContain('Улучшенная вентиляция');
    expect(container.textContent).toContain('+5 % к основным навыкам экипажа.');
  });

  it('asks the client for its own tooltip with the name and the effect when it can draw one', () => {
    const events = installClientTooltip();
    const container = drawNew(true);

    hover(container, 'mouseenter');

    expect(container.textContent).toBe('');
    expect(events.at(-1)).toMatchObject({ on: true, isMouseEvent: true });
    expect(JSON.stringify(events.at(-1))).toContain('Улучшенная вентиляция');
    expect(JSON.stringify(events.at(-1))).toContain('+5 % к основным навыкам экипажа.');
  });

  it('closes the client tooltip once the pointer leaves the item', () => {
    const events = installClientTooltip();
    const container = drawNew(true);

    hover(container, 'mouseenter');
    hover(container, 'mouseleave');

    expect(events.at(-1)).toMatchObject({ on: false });
  });

  it('hides the explanation once the pointer leaves the item', () => {
    const container = drawNew(true);

    hover(container, 'mouseenter');

    hover(container, 'mouseleave');

    expect(container.textContent).not.toContain('Улучшенная вентиляция');
  });

  it('drops the tooltip when the panel stops taking the pointer', () => {
    const container = drawNew(true);

    hover(container, 'mouseenter');

    draw(container, false);

    expect(container.textContent).not.toContain('Улучшенная вентиляция');
  });

  it('does not bring the tooltip back when the panel takes the pointer again', () => {
    const container = drawNew(true);

    hover(container, 'mouseenter');
    draw(container, false);

    draw(container, true);

    expect(container.textContent).not.toContain('Улучшенная вентиляция');
  });
});
