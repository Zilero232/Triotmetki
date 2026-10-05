// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { toneClass } from '@/ui-kit';

import type { ReportRow } from '../../../../../../lib/marks-report';

import { ReportTable } from '../ReportTable';

import s from '../ReportTable.module.scss';

const GAINED: ReportRow = { key: 'b1', date: '12.09 21:40', damage: '4 500', percent: '85,20 %', delta: '+0,40 %', tone: 'good' };

const deltaCell = (html: HTMLElement): Element | undefined => [...html.querySelectorAll('span')].find((span) => span.textContent === GAINED.delta);

describe(ReportTable, () => {
  it('colours the delta cell by its tone', () => {
    const html = render(<ReportTable rows={[GAINED]} />).container;

    const cell = deltaCell(html);

    expect(cell?.classList.contains(toneClass('good') ?? '')).toBe(true);
  });

  it('keeps the plain text colour off the delta cell so the tone is not overridden', () => {
    const html = render(<ReportTable rows={[GAINED]} />).container;

    const cell = deltaCell(html);

    expect(cell?.classList.contains(s.value ?? '')).toBe(false);
  });
});
