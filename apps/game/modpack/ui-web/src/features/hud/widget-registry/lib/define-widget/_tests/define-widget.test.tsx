// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';

import type { HudWidgetProps } from '../define-widget.types';

import { defineHudWidget } from '../define-widget';

const schema = z.object({ text: z.string() });

const Broken = ({ data }: HudWidgetProps<{ text: string }>) => {
  if (data.text === 'boom') {
    throw new Error('widget failed');
  }

  return <span>{data.text}</span>;
};

const entry = defineHudWidget({ kind: 'probe', schema, Component: Broken });

const nodeOf = (text: string) => {
  const parsed = entry.parse({ text });

  if (!parsed) {
    throw new Error('the probe does not parse');
  }

  return parsed.node;
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe(defineHudWidget, () => {
  it('keeps the other widgets on the page when one throws while it renders', () => {
    const html = render(
      <div>
        {nodeOf('boom')}
        {nodeOf('alive')}
      </div>
    ).container;

    expect(html.textContent).toBe('alive');
  });

  it('draws a failed widget again once its data changes', () => {
    const view = render(<div>{nodeOf('boom')}</div>);

    view.rerender(<div>{nodeOf('back')}</div>);

    expect(view.container.textContent).toBe('back');
  });
});
