// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GAMEFACE } from '@/shared/api/gameface';

import { useTooltip } from '../use-tooltip';

const CONTENT_ID = 11;
const DECORATOR_ID = 12;

const resources = () => ({
  views: {
    common: {
      tooltip_window: {
        simple_tooltip_content: { SimpleTooltipContent: () => CONTENT_ID },
        tooltip_window: { TooltipWindow: () => DECORATOR_ID }
      }
    }
  }
});

const installClient = (): unknown[] => {
  const events: unknown[] = [];

  Reflect.set(globalThis, GAMEFACE.globals.resources, resources());
  Reflect.set(globalThis, GAMEFACE.globals.viewEnv, { [GAMEFACE.viewEvent.handle]: (event: unknown) => events.push(event) });

  return events;
};

afterEach(() => {
  Reflect.deleteProperty(globalThis, GAMEFACE.globals.resources);
  Reflect.deleteProperty(globalThis, GAMEFACE.globals.viewEnv);
});

describe(useTooltip, () => {
  it('falls back to the title attribute outside the client', () => {
    const hook = renderHook(() => useTooltip('Zoom in'));

    const props = hook.result.current;

    expect(props).toEqual({ title: 'Zoom in' });
  });

  it('asks the client for its own tooltip on hover', () => {
    const events = installClient();
    const hook = renderHook(() => useTooltip('Zoom in'));

    hook.result.current.onMouseEnter?.();

    expect(events).toEqual([
      {
        __Type: GAMEFACE.viewEvent.eventType,
        type: GAMEFACE.viewEvent.tooltip,
        targetID: GAMEFACE.viewEvent.targetId,
        on: true,
        contentID: CONTENT_ID,
        decoratorID: DECORATOR_ID,
        isMouseEvent: true,
        arguments: [
          { __Type: GAMEFACE.viewEvent.valueType, name: 'header', string: '' },
          { __Type: GAMEFACE.viewEvent.valueType, name: 'body', string: 'Zoom in' }
        ]
      }
    ]);
  });

  it('hides the client tooltip when the control goes away under the pointer', () => {
    const events = installClient();
    const hook = renderHook(() => useTooltip('Zoom in'));

    hook.result.current.onMouseEnter?.();

    hook.unmount();

    expect(events.at(-1)).toEqual({
      __Type: GAMEFACE.viewEvent.eventType,
      type: GAMEFACE.viewEvent.tooltip,
      targetID: GAMEFACE.viewEvent.targetId,
      on: false,
      contentID: CONTENT_ID,
      decoratorID: DECORATOR_ID
    });
  });

  it('gives no tooltip props without a text', () => {
    const hook = renderHook(() => useTooltip(undefined));

    const props = hook.result.current;

    expect(props).toEqual({});
  });
});
