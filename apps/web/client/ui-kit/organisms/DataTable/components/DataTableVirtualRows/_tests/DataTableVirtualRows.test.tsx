import type { ReactElement } from 'react';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TableColumn } from '../../../DataTable.types';

import { DataTable } from '../../../DataTable';
import { DATA_TABLE } from '../../../DataTable.constants';

type Row = { name: string; rank: number };

const TOTAL = 400;
const VIRTUALIZE_AFTER = 50;
const ROW_HEIGHT = DATA_TABLE.rowHeight.default;
const VIEWPORT = ROW_HEIGHT * 10;

const ROWS: Row[] = Array.from({ length: TOTAL }, (_, index) => ({ name: `Player ${index}`, rank: index }));

const COLUMNS: TableColumn<Row>[] = [
  { accessorKey: 'name', header: 'Nickname' },
  { id: 'action', header: 'Action', cell: () => <button type='button'>Watch</button> }
];

const renderTable = async (ui: ReactElement) => {
  const { container } = render(ui);

  await screen.findByRole('columnheader', { name: /Nickname/ });

  return container;
};

const bodyRows = () => screen.getAllByRole('row').slice(1);

const renderedNames = () => bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent);

const stubViewport = () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 0, y: 0, width: 800, height: VIEWPORT }));
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DataTableVirtualRows', () => {
  it('renders only a window of a long list, starting at the top', async () => {
    stubViewport();
    await renderTable(<DataTable columns={COLUMNS} data={ROWS} virtualizeAfter={VIRTUALIZE_AFTER} />);

    const names = renderedNames();

    expect(names[0]).toBe(ROWS[0].name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.length).toBeLessThan(TOTAL);
  });

  it('moves the window when the table is scrolled', async () => {
    stubViewport();
    const container = await renderTable(<DataTable columns={COLUMNS} data={ROWS} virtualizeAfter={VIRTUALIZE_AFTER} />);
    const scroller = container.querySelector('[data-virtual="true"]');

    if (!(scroller instanceof HTMLElement)) {
      throw new TypeError('virtual scroller missing');
    }

    const target = TOTAL / 2;

    act(() => {
      scroller.scrollTop = target * ROW_HEIGHT;
      fireEvent.scroll(scroller);
    });

    expect(renderedNames()).toContain(ROWS[target].name);
    expect(renderedNames()).not.toContain(ROWS[0].name);
  });

  it('hands the clicked row to onRowClick', async () => {
    stubViewport();
    const onRowClick = vi.fn<(row: Row) => void>();

    await renderTable(<DataTable columns={COLUMNS} data={ROWS} virtualizeAfter={VIRTUALIZE_AFTER} onRowClick={onRowClick} />);

    fireEvent.click(within(bodyRows()[1]).getAllByRole('cell')[0]);

    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
  });

  it('leaves clicks on controls inside a row to the control', async () => {
    stubViewport();
    const onRowClick = vi.fn<(row: Row) => void>();

    await renderTable(<DataTable columns={COLUMNS} data={ROWS} virtualizeAfter={VIRTUALIZE_AFTER} onRowClick={onRowClick} />);

    fireEvent.click(within(bodyRows()[0]).getByRole('button', { name: 'Watch' }));

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
