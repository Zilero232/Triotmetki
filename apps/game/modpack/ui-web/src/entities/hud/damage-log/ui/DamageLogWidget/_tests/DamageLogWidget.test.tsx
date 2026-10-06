// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { damageLogSchema } from '../../../model/schemas';
import { DamageLogWidget } from '../DamageLogWidget';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

const fixture = damageLogSchema.parse(readWidgetFixture('damage_log'));

describe(DamageLogWidget, () => {
  it('draws the totals as an icon and a number', () => {
    const html = render(<DamageLogWidget data={fixture} />).container;

    expect(sources(html)).toContain('img://gui/maps/icons/library/efficiency/48x48/damage.png');
    expect(html.textContent).toContain('710');
  });

  it('draws the rows of both sections with the target and the attacker', () => {
    const html = render(<DamageLogWidget data={fixture} />).container;

    expect(html.textContent).toContain('Pz. IV');
    expect(html.textContent).toContain('-310');
    expect(html.textContent).toContain('KV-1');
  });

  it('writes the shell label in a chip', () => {
    const html = render(<DamageLogWidget data={fixture} />).container;

    expect(html.textContent).toContain('ОФ');
  });

  it('adds the notes the Python side sends', () => {
    const html = render(<DamageLogWidget data={fixture} />).container;

    expect(html.textContent).toContain('боеукладка');
  });

  it('draws the target HP bar on the own shots only', () => {
    const html = render(<DamageLogWidget data={fixture} />).container;

    expect(html.querySelectorAll('[style*="width: 36rem"]')).toHaveLength(2);
  });

  it('is wider with the notes than without them', () => {
    const wide = render(<DamageLogWidget data={fixture} />).container.firstElementChild?.className;
    const narrow = render(<DamageLogWidget data={{ ...fixture, wide: false }} />).container.firstElementChild?.className;

    expect(wide).not.toBe(narrow);
  });

  it('keeps to the totals when no section has rows', () => {
    const html = render(<DamageLogWidget data={{ ...fixture, dealt: [], received: [] }} />).container;

    expect(html.textContent).not.toContain('KV-1');
    expect(html.textContent).toContain('710');
  });
});
